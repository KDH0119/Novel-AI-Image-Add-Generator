// ============ Global State ============
const state = {
    apiKey: '',
    saveFolder: '', 
    artistTags: '',
    negativeTags: '',
    characters: [{ id: 1, tags: '', negativeTags: '' }],
    memoPads: [],
    generatedImages: [],
    mode: 'continuous',
    imageSize: { width: 832, height: 1216 },
    nextCharId: 2,
    nextMemoId: 1,
    samplingSteps: 28,
    promptScale: 6,
    promptRescale: 0.1,
    
    // 상태 변수들
    varietyPlus: false,
    referenceImage: null,
    useStyleAware: false,
    referenceStrength: 1.0
};

let activeMemoModalId = null;

// ============ Initialization ============
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();

    // 메모장이 없으면 기본 생성
    if (state.memoPads.length === 0) {
        state.memoPads.push({
            id: Date.now(),
            title: '메모장 1',
            characters: [{ charIndex: 0, situationTags: '' }]
        });
    }

    initEventListeners();
    updateUI();
});

// ============ UI Helper Functions (누락된 함수 복구 완료) ============
function showToast(msg) { alert(msg); }

function showLoading(show) { 
    const el = document.getElementById('loadingOverlay');
    if(el) el.style.display = show ? 'flex' : 'none'; 
}

function updateLoadingText(text) { 
    const el = document.getElementById('loadingText');
    if(el) el.textContent = text; 
}

// ★★★ [복구됨] 진행바 관련 함수들 ★★★
function showProgress(show) {
    const el = document.getElementById('progressSection');
    if (el) {
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    }
}

function updateProgress(current, total) {
    const percent = Math.min(100, (current / total) * 100);
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `${current} / ${total}`;
}

function enableDownloadButton() {
    const btn = document.getElementById('downloadAll');
    if (btn) btn.disabled = false;
}
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★

function updateStatusText(text, containerId, insertBeforeId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let statusEl = container.querySelector('.status-text');
    if (!statusEl) {
        statusEl = document.createElement('span');
        statusEl.className = 'status-text';
        const refEl = document.getElementById(insertBeforeId);
        if(refEl) container.insertBefore(statusEl, refEl);
        else container.appendChild(statusEl);
    }
    statusEl.textContent = text;
    statusEl.style.display = text ? 'inline' : 'none';
}

function closeImageLightbox() {
    const lightbox = document.getElementById('previewLightbox');
    if (lightbox) lightbox.classList.add('hidden');
    const img = document.getElementById('lightboxImage');
    if (img) img.src = '';
}

function openImageLightbox(src) {
    const lightbox = document.getElementById('previewLightbox');
    const img = document.getElementById('lightboxImage');
    if (lightbox && img) {
        img.src = src;
        lightbox.classList.remove('hidden');
    }
}

function closeMemoModal() {
    activeMemoModalId = null;
    document.getElementById('memoModal').classList.add('hidden');
}

function closeAdvancedSettings() {
    document.getElementById('advancedSettingsModal').classList.add('hidden');
}

function updateModeUI() {
    const continuousBtn = document.getElementById('modeContinuous');
    const memoPadBtn = document.getElementById('modeMemoPad');
    const continuousSettings = document.getElementById('continuousSettings');
    const memoPadSettings = document.getElementById('memoPadSettings');

    if (state.mode === 'continuous') {
        continuousBtn.classList.add('active');
        memoPadBtn.classList.remove('active');
        continuousSettings.classList.remove('hidden');
        memoPadSettings.classList.add('hidden');
    } else {
        continuousBtn.classList.remove('active');
        memoPadBtn.classList.add('active');
        continuousSettings.classList.add('hidden');
        memoPadSettings.classList.remove('hidden');
    }
}

function sanitizeFilename(filename) { 
    return filename.replace(/[^a-zA-Z0-9\uAC00-\uD7A3\u3131-\u318E_]/g, '_'); 
}

// ============ Event Listeners ============
function initEventListeners() {
    // API 키 저장
    document.getElementById('saveApiKey').addEventListener('click', () => {
        state.apiKey = document.getElementById('apiKey').value.trim();
        saveToLocalStorage();
        showToast('API 키가 저장되었습니다.');
    });

    // 태그 입력
    document.getElementById('artistTags').addEventListener('blur', (e) => { state.artistTags = e.target.value; saveToLocalStorage(); });
    document.getElementById('negativeTags').addEventListener('blur', (e) => { state.negativeTags = e.target.value; saveToLocalStorage(); });

    // 캐릭터 관리
    document.getElementById('addCharacter').addEventListener('click', addCharacter);
    document.getElementById('imageSize').addEventListener('change', (e) => {
        const [width, height] = e.target.value.split('x').map(Number);
        state.imageSize = { width, height };
        updatePreviewLayout();
    });

    // 모드 전환
    document.getElementById('modeContinuous').addEventListener('click', () => { state.mode = 'continuous'; updateModeUI(); });
    document.getElementById('modeMemoPad').addEventListener('click', () => { state.mode = 'memoPad'; updateModeUI(); });

    // 생성 버튼
    document.getElementById('generateContinuous').addEventListener('click', startContinuousGeneration);
    document.getElementById('generateMemoPad').addEventListener('click', startMemoPadGeneration);
    document.getElementById('addMemoPad').addEventListener('click', addMemoPad);
    document.getElementById('downloadAll').addEventListener('click', downloadAllImages);

    // 라이트박스
    const lightbox = document.getElementById('previewLightbox');
    lightbox.addEventListener('click', (e) => { if(e.target === lightbox) closeImageLightbox(); });
    const lightboxCloseBtn = lightbox.querySelector('.lightbox-close');
    if(lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeImageLightbox);

    // 메모장 모달
    const memoModal = document.getElementById('memoModal');
    memoModal.addEventListener('click', (e) => { if(e.target === memoModal) closeMemoModal(); });
    document.getElementById('closeMemoModal').addEventListener('click', closeMemoModal);
    document.getElementById('memoModalAddChar').addEventListener('click', () => { if(activeMemoModalId !== null) addMemoCharacter(activeMemoModalId); });
    document.getElementById('memoModalTitle').addEventListener('input', handleMemoModalTitleInput);
    
    // JSON
    document.getElementById('exportMemoJson').addEventListener('click', exportMemoJson);
    document.getElementById('importMemoJson').addEventListener('click', () => document.getElementById('memoJsonFile').click());
    document.getElementById('memoJsonFile').addEventListener('change', handleMemoJsonFile);

    // 고급 설정
    document.getElementById('openAdvancedSettings').addEventListener('click', openAdvancedSettings);
    document.getElementById('closeAdvancedSettings').addEventListener('click', closeAdvancedSettings);
    document.getElementById('saveAdvancedSettings').addEventListener('click', saveAdvancedSettings);
    document.getElementById('advancedSettingsModal').addEventListener('click', (e) => { 
        if(e.target === document.getElementById('advancedSettingsModal')) closeAdvancedSettings(); 
    });

    // 레퍼런스
    document.getElementById('refImageInput').addEventListener('change', handleRefImageUpload);
    document.getElementById('removeRefImage').addEventListener('click', clearRefImage);
    document.getElementById('chkStyleAware').addEventListener('change', (e) => { state.useStyleAware = e.target.checked; toggleRefUI(); });
    document.getElementById('rngRefStrength').addEventListener('input', (e) => {
        state.referenceStrength = parseFloat(e.target.value);
        document.getElementById('refStrengthValue').textContent = state.referenceStrength.toFixed(2);
    });
}

// ============ Local Storage ============
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('novelai_batch_state');
        if (!saved) return;
        const parsed = JSON.parse(saved);

        state.apiKey = parsed.apiKey || '';
        state.artistTags = parsed.artistTags || '';
        state.negativeTags = parsed.negativeTags || '';
        
        // 캐릭터 및 메모장 복구
        state.characters = (parsed.characters || []).map(c => ({ ...c, negativeTags: c.negativeTags || '' }));
        state.memoPads = parsed.memoPads || [];
        
        // ID 복구
        state.nextCharId = parsed.nextCharId || (Date.now() + 1);
        state.nextMemoId = parsed.nextMemoId || (state.memoPads.length > 0 ? Math.max(...state.memoPads.map(m => m.id)) + 1 : 1);

        state.samplingSteps = parsed.samplingSteps || 28;
        state.promptScale = parsed.promptScale || 6;
        state.promptRescale = parsed.promptRescale || 0.1;
        state.varietyPlus = !!parsed.varietyPlus;
        state.useStyleAware = !!parsed.useStyleAware;
        state.referenceStrength = parsed.referenceStrength || 1.0;

        document.getElementById('apiKey').value = state.apiKey;
        if(document.getElementById('saveFolder')) document.getElementById('saveFolder').value = state.saveFolder;
        document.getElementById('artistTags').value = state.artistTags;
        document.getElementById('negativeTags').value = state.negativeTags;
        
        renderCharacters();
        renderMemoPads();
    } catch (error) {
        console.error('로드 오류:', error);
    }
}

function saveToLocalStorage() {
    const payload = {
        apiKey: state.apiKey,
        saveFolder: state.saveFolder,
        artistTags: state.artistTags,
        negativeTags: state.negativeTags,
        characters: state.characters,
        memoPads: state.memoPads,
        nextCharId: state.nextCharId,
        nextMemoId: state.nextMemoId,
        samplingSteps: state.samplingSteps,
        promptScale: state.promptScale,
        promptRescale: state.promptRescale,
        varietyPlus: state.varietyPlus,
        useStyleAware: state.useStyleAware,
        referenceStrength: state.referenceStrength
    };
    localStorage.setItem('novelai_batch_state', JSON.stringify(payload));
}

// ============ Core Logic ============

function updateUI() {
    renderCharacters();
    renderMemoPads();
    updateModeUI();
    updatePreviewLayout();
}

function updatePreviewLayout() {
    const container = document.getElementById('previewContainer');
    const { width, height } = state.imageSize;
    container.className = 'preview-gallery';
    if (width < height) container.classList.add('portrait');
    else if (width > height) container.classList.add('landscape');
    else container.classList.add('square');
}

// Character Functions
function addCharacter() {
    if (state.characters.length >= 3) return showToast('최대 3명까지만 가능합니다.');
    state.characters.push({ id: state.nextCharId++, tags: '', negativeTags: '' });
    saveToLocalStorage();
    renderCharacters();
}

function removeCharacter(charId) {
    if (state.characters.length <= 1) return showToast('최소 1명은 필요합니다.');
    state.characters = state.characters.filter(c => c.id !== charId);
    saveToLocalStorage();
    renderCharacters();
}

function renderCharacters() {
    const container = document.getElementById('characterList');
    container.innerHTML = '';
    state.characters.forEach((char, index) => {
        const div = document.createElement('div');
        div.className = 'character-item';
        div.innerHTML = `
            <div class="char-header"><span>캐릭터 ${index + 1}</span><button class="btn-remove-char">✕</button></div>
            <div class="input-group"><label>외형 태그</label><textarea class="input-textarea char-tags" rows="3">${char.tags}</textarea></div>
            <div class="input-group" style="margin-bottom:0;"><label>개별 네거티브</label><textarea class="input-textarea char-negative-tags" rows="2">${char.negativeTags}</textarea></div>
        `;
        div.querySelector('.char-tags').addEventListener('blur', (e) => { char.tags = e.target.value; saveToLocalStorage(); });
        div.querySelector('.char-negative-tags').addEventListener('blur', (e) => { char.negativeTags = e.target.value; saveToLocalStorage(); });
        div.querySelector('.btn-remove-char').addEventListener('click', () => removeCharacter(char.id));
        container.appendChild(div);
    });
}

// Memo Pad Functions
function addMemoPad() {
    if (state.memoPads.length >= 50) return showToast('메모장 최대 50개');
    state.memoPads.push({ id: state.nextMemoId++, title: `메모장 ${state.memoPads.length + 1}`, characters: [{ charIndex: 0, situationTags: '' }] });
    saveToLocalStorage();
    renderMemoPads();
}

function removeMemoPad(memoId) {
    state.memoPads = state.memoPads.filter(m => m.id !== memoId);
    if (activeMemoModalId === memoId) closeMemoModal();
    saveToLocalStorage();
    renderMemoPads();
}

function renderMemoPads() {
    const container = document.getElementById('memoList');
    container.innerHTML = '';
    if (state.memoPads.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#71717a;">메모장을 추가하세요.</div>`;
    } else {
        state.memoPads.forEach(memo => {
            const div = document.createElement('div');
            div.className = 'memo-item';
            div.innerHTML = `
                <div class="memo-header"><span class="memo-title">${memo.title}</span><div class="memo-actions"><button class="btn-icon memo-expand">⤢</button><button class="btn-icon danger memo-delete">✕</button></div></div>
                <div class="memo-summary">${getMemoSummary(memo)}</div>
            `;
            div.querySelector('.memo-expand').addEventListener('click', () => openMemoModal(memo.id));
            div.querySelector('.memo-delete').addEventListener('click', () => removeMemoPad(memo.id));
            container.appendChild(div);
        });
    }
    const badge = document.querySelector('.count-badge');
    if(badge) badge.textContent = `${state.memoPads.length}/50`;
}

function getMemoSummary(memo) {
    if (!memo.characters.length) return '내용 없음';
    return memo.characters.slice(0, 2).map(c => `<span>캐릭터 ${(c.charIndex??0)+1}: ${c.situationTags || '미입력'}</span>`).join('') + (memo.characters.length > 2 ? '...' : '');
}

function openMemoModal(memoId) {
    activeMemoModalId = memoId;
    document.getElementById('memoModal').classList.remove('hidden');
    renderMemoModal();
}

function renderMemoModal() {
    const memo = state.memoPads.find(m => m.id === activeMemoModalId);
    if (!memo) return closeMemoModal();
    document.getElementById('memoModalTitle').value = memo.title;
    const list = document.getElementById('memoModalCharList');
    list.innerHTML = '';
    memo.characters.forEach((char, idx) => {
        const div = document.createElement('div');
        div.className = 'memo-modal-char-item';
        div.innerHTML = `
            <div class="memo-modal-char-header"><span>캐릭터 ${char.charIndex + 1} 상황</span><button class="btn-text danger">삭제</button></div>
            <textarea class="input-textarea" rows="3">${char.situationTags}</textarea>
        `;
        div.querySelector('textarea').addEventListener('input', (e) => char.situationTags = e.target.value);
        div.querySelector('textarea').addEventListener('blur', () => { saveToLocalStorage(); renderMemoPads(); });
        div.querySelector('.btn-text').addEventListener('click', () => removeMemoCharacter(memo.id, idx));
        list.appendChild(div);
    });
}

function addMemoCharacter(memoId) {
    const memo = state.memoPads.find(m => m.id === memoId);
    if (memo.characters.length >= state.characters.length) return showToast('캐릭터 수 초과');
    memo.characters.push({ charIndex: memo.characters.length, situationTags: '' });
    saveToLocalStorage(); renderMemoPads(); renderMemoModal();
}

function removeMemoCharacter(memoId, idx) {
    const memo = state.memoPads.find(m => m.id === memoId);
    if (memo.characters.length <= 1) return showToast('최소 1명 필요');
    memo.characters.splice(idx, 1);
    memo.characters.forEach((c, i) => c.charIndex = i);
    saveToLocalStorage(); renderMemoPads(); renderMemoModal();
}

function handleMemoModalTitleInput(e) {
    if (activeMemoModalId === null) return;
    const memo = state.memoPads.find(m => m.id === activeMemoModalId);
    if (memo) { memo.title = e.target.value; saveToLocalStorage(); renderMemoPads(); }
}

// Advanced Settings
function openAdvancedSettings() {
    const modal = document.getElementById('advancedSettingsModal');
    document.getElementById('inputSteps').value = state.samplingSteps;
    document.getElementById('inputPromptScale').value = state.promptScale;
    document.getElementById('inputPromptRescale').value = state.promptRescale;
    if(document.getElementById('chkVarietyPlus')) {
        document.getElementById('chkVarietyPlus').checked = state.varietyPlus;
    }
    updateRefUIFromState();
    modal.classList.remove('hidden');
}

function saveAdvancedSettings() {
    state.samplingSteps = parseInt(document.getElementById('inputSteps').value) || 28;
    state.promptScale = parseFloat(document.getElementById('inputPromptScale').value) || 6;
    state.promptRescale = parseFloat(document.getElementById('inputPromptRescale').value) || 0;
    if(document.getElementById('chkVarietyPlus')) {
        state.varietyPlus = document.getElementById('chkVarietyPlus').checked;
    }
    saveToLocalStorage();
    closeAdvancedSettings();
    showToast('추가 설정이 적용되었습니다.');
}

// Reference Logic
function handleRefImageUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            const TARGETS = [{w:1024,h:1536}, {w:1536,h:1024}, {w:1472,h:1472}];
            const iw = img.width, ih = img.height;
            let best = TARGETS[0], minPad = Infinity;
            TARGETS.forEach(t => {
                const scale = Math.min(t.w/iw, t.h/ih);
                const pw = t.w - iw*scale, ph = t.h - ih*scale;
                if(pw*ph < minPad) { minPad = pw*ph; best = t; }
            });
            const canvas = document.createElement('canvas');
            canvas.width = best.w; canvas.height = best.h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = "#000000";
            ctx.fillRect(0,0,best.w,best.h);
            const scale = Math.min(best.w/iw, best.h/ih);
            const nw = Math.round(iw*scale), nh = Math.round(ih*scale);
            ctx.drawImage(img, (best.w-nw)/2, (best.h-nh)/2, nw, nh);
            
            const base64 = canvas.toDataURL('image/png').split(',')[1];
            state.referenceImage = base64;
            document.getElementById('refImagePreview').src = `data:image/png;base64,${base64}`;
            state.useStyleAware = false;
            document.getElementById('chkStyleAware').checked = false;
            toggleRefUI();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

function clearRefImage() {
    state.referenceImage = null;
    document.getElementById('refImageInput').value = '';
    document.getElementById('refImagePreview').src = '';
    toggleRefUI();
}

function toggleRefUI() {
    const has = !!state.referenceImage;
    document.getElementById('refImagePreviewContainer').classList.toggle('hidden', !has);
    document.getElementById('styleAwareContainer').classList.toggle('hidden', !has);
    document.getElementById('refStrengthContainer').classList.toggle('hidden', !(has && state.useStyleAware));
}

function updateRefUIFromState() {
    if(state.referenceImage) {
        document.getElementById('refImagePreview').src = `data:image/png;base64,${state.referenceImage}`;
        document.getElementById('chkStyleAware').checked = state.useStyleAware;
        document.getElementById('rngRefStrength').value = state.referenceStrength;
        document.getElementById('refStrengthValue').textContent = state.referenceStrength.toFixed(2);
    }
    toggleRefUI();
}

// JSON
function exportMemoJson() {
    const data = { memoPads: state.memoPads };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `memo_backup.json`; a.click();
}

function handleMemoJsonFile(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if(parsed.memoPads) {
                state.memoPads = parsed.memoPads;
                saveToLocalStorage(); renderMemoPads();
                showToast('불러오기 완료');
            }
        } catch(err) { showToast('JSON 오류'); }
    };
    reader.readAsText(file);
}

// ============ Image Generation ============
async function startContinuousGeneration() {
    if(!validateSettings()) return;
    const count = parseInt(document.getElementById('imageCount').value) || 1;
    state.generatedImages = [];
    showProgress(true);
    const btn = document.getElementById('generateContinuous');
    btn.disabled = true;

    try {
        for(let i=0; i<count; i++) {
            updateStatusText(`${i+1}/${count} 생성중..`, 'continuousSettings', 'imageCount');
            updateLoadingText(`생성 중... (${i+1}/${count})`);
            
            const b64 = await generateImage({
                artistTags: state.artistTags, negativeTags: state.negativeTags,
                characters: state.characters.map(c => ({ appearanceTags: c.tags, situationTags: '', charNegativeTags: c.negativeTags }))
            });
            state.generatedImages.push({ id: Date.now()+i, data: b64, filename: `gen_${i+1}.png` });
            updateProgress(i+1, count);
            renderPreview();
        }
        showToast(`${count}장 생성 완료!`);
        enableDownloadButton();
    } catch(e) {
        console.error(e); showToast('오류: ' + e.message);
    } finally {
        updateStatusText('', 'continuousSettings', 'imageCount');
        showLoading(false); btn.disabled = false;
    }
}

async function startMemoPadGeneration() {
    if(!validateSettings()) return;
    if(!state.memoPads.length) return showToast('메모장이 없습니다.');
    state.generatedImages = [];
    showProgress(true);
    const btn = document.getElementById('generateMemoPad');
    btn.disabled = true;

    try {
        for(let i=0; i<state.memoPads.length; i++) {
            const m = state.memoPads[i];
            updateStatusText(`${i+1}/${state.memoPads.length} 생성중..`, 'memoPadSettings', 'generateMemoPad');
            updateLoadingText(`${m.title} 생성 중... (${i+1}/${state.memoPads.length})`);
            
            const chars = m.characters.map(mc => {
                const base = state.characters[mc.charIndex] || {};
                return { appearanceTags: base.tags||'', situationTags: mc.situationTags, charNegativeTags: base.negativeTags||'' };
            });
            const b64 = await generateImage({ artistTags: state.artistTags, negativeTags: state.negativeTags, characters: chars });
            state.generatedImages.push({ id: m.id, data: b64, filename: `${sanitizeFilename(m.title)}.png` });
            updateProgress(i+1, state.memoPads.length);
            renderPreview();
        }
        showToast('전체 생성 완료!');
        enableDownloadButton();
    } catch(e) {
        console.error(e); showToast('오류: ' + e.message);
    } finally {
        updateStatusText('', 'memoPadSettings', 'generateMemoPad');
        showLoading(false); btn.disabled = false;
    }
}

async function generateImage(config) {
    const basePrompt = config.artistTags;
    const charCaptions = config.characters.map(c => ({
        char_caption: [c.appearanceTags, c.situationTags].filter(Boolean).join(', '),
        centers: [{x:0.5, y:0.5}]
    }));
    const charNegs = config.characters.map(c => ({
        char_caption: c.charNegativeTags, centers: [{x:0.5, y:0.5}]
    }));

    const requestBody = {
        input: basePrompt, model: 'nai-diffusion-4-5-full', action: 'generate', prompt: basePrompt,
        parameters: {
            params_version: 3, width: state.imageSize.width, height: state.imageSize.height, scale: state.promptScale,
            sampler: 'k_euler_ancestral', steps: state.samplingSteps, seed: Math.floor(Math.random()*9999999999),
            n_samples: 1, ucPreset: 0, qualityToggle: true,
            v4_prompt: { caption: { base_caption: basePrompt, char_captions: charCaptions }, use_coords: false, use_order: true },
            v4_negative_prompt: { caption: { base_caption: config.negativeTags, char_captions: charNegs }, legacy_uc: false },
            prompt: basePrompt, negative_prompt: config.negativeTags, uc: config.negativeTags,
            uncond_scale: 0, cfg_rescale: state.promptRescale, noise_schedule: 'karras',
            
            skip_cfg_above_sigma: state.varietyPlus ? 58 : null,
            skip_cfg_below_sigma: 0,
            
            legacy: false, add_original_image: true, prefer_brownian: true,
            reference_information_extracted_multiple: [], reference_strength_multiple: [], reference_image_multiple: [],
            director_reference_strength_values: null, director_reference_descriptions: null,
            director_reference_information_extracted: null, director_reference_secondary_strength_values: null,
            director_reference_images: null
        },
        use_new_shared_trial: true
    };

    if(state.referenceImage) {
        const encoded = encodeURIComponent(state.referenceImage);
        const invStrength = parseFloat((1 - state.referenceStrength).toFixed(2));
        requestBody.parameters.director_reference_images = [encoded];
        requestBody.parameters.director_reference_strength_values = [1.0];
        requestBody.parameters.director_reference_information_extracted = [1.0];
        requestBody.parameters.director_reference_secondary_strength_values = [state.useStyleAware ? invStrength : 0];
        requestBody.parameters.director_reference_descriptions = [{ caption: { base_caption: state.useStyleAware?"character&style":"character", char_captions:[] }, legacy_uc: false }];
    }

    const res = await fetch('/api/novelai/generate-image', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ apiKey: state.apiKey, requestBody })
    });
    if(!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
    const blob = await res.blob();
    
    const zip = await (new JSZip()).loadAsync(blob);
    const file = Object.keys(zip.files).find(n => n.match(/\.(png|jpg)$/));
    return await zip.files[file].async('base64');
}

function renderPreview() {
    const el = document.getElementById('previewContainer');
    el.innerHTML = '';
    if(!state.generatedImages.length) {
        el.innerHTML = `<div class="empty-state"><div class="icon">🖼️</div><p>이미지가 생성되면 이곳에 표시됩니다.</p></div>`;
        return;
    }
    state.generatedImages.forEach((img, i) => {
        const div = document.createElement('div');
        div.className = 'preview-image-item';
        div.innerHTML = `
            <img src="data:image/png;base64,${img.data}">
            <div class="preview-image-label">${i+1}</div>
            <button class="preview-save-btn" title="저장">💾</button>
            <button class="preview-zoom-btn">⤢</button>
        `;
        div.querySelector('.preview-save-btn').addEventListener('click', (e) => { e.stopPropagation(); saveSingleImage(img); });
        div.querySelector('.preview-zoom-btn').addEventListener('click', (e) => { e.stopPropagation(); openImageLightbox(`data:image/png;base64,${img.data}`); });
        el.appendChild(div);
    });
}

function saveSingleImage(img) {
    showToast(`${img.filename} 다운로드를 시작합니다.`);
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${img.data}`; a.download = img.filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

async function downloadAllImages() {
    if (state.generatedImages.length === 0) return;
    showLoading(true);
    updateLoadingText('이미지 압축 중...');

    try {
        const JSZip = window.JSZip;
        const zip = new JSZip();
        state.generatedImages.forEach(img => {
            zip.file(img.filename, img.data, { base64: true });
        });
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `novelai_batch_${new Date().getTime()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('다운로드가 완료되었습니다.');
    } catch (error) {
        console.error('압축 오류:', error);
        showToast('다운로드 중 오류 발생');
    } finally {
        showLoading(false);
    }
}

function validateSettings() {
    if(!state.apiKey) { showToast('API 키 필요'); return false; }
    if(!state.artistTags) { showToast('작가 태그 필요'); return false; }
    return true;
}