const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// [중요] 'public' 폴더의 파일을 웹사이트로 제공
app.use(express.static(path.join(__dirname, 'public')));

// 메인 페이지 접속 시
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'batch-generator.html'));
});

// NovelAI 이미지 생성 프록시
app.post('/api/novelai/generate-image', async (req, res) => {
    try {
        let bodyContent = req.body;
        // 이중 문자열 방지
        if (typeof bodyContent === 'string') {
            bodyContent = JSON.parse(bodyContent);
        }

        const { apiKey, requestBody } = bodyContent;

        // [전송 무결성] Base64 문자열 디코딩 (클라이언트에서 인코딩해서 보냄)
        if (requestBody.parameters && 
            requestBody.parameters.director_reference_images && 
            requestBody.parameters.director_reference_images.length > 0) {
                
            requestBody.parameters.director_reference_images = 
                requestBody.parameters.director_reference_images.map(encodedStr => 
                    decodeURIComponent(encodedStr)
                );
        }

        const response = await fetch('https://image.novelai.net/ai/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('!! NovelAI API 오류:', response.status, errorText);
            return res.status(response.status).json({
                error: errorText,
                status: response.status
            });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.set('Content-Type', 'application/zip');
        res.send(buffer);
    } catch (error) {
        console.error('!! 프록시 서버 오류:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});