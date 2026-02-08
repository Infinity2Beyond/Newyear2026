document.addEventListener("DOMContentLoaded", function () {
    // ============================================================
    // 1. KHỞI TẠO CÁC BIẾN & ELEMENT
    // ============================================================
    
    // Element Thiệp & Hiệu ứng
    const modal = document.querySelector('.js-modal');
    const btnOpenCard = document.querySelector('.open');
    const btnCloseCard = document.querySelector('.close');
    const cardPkg = document.querySelector('.card-packaging');
    const audioMain = document.getElementById("AudioMain");

    // Canvas
    const canvasBg = document.getElementById("canvas");
    const ctxBg = canvasBg.getContext("2d");
    const canvasFw = document.getElementById("fireworks");
    const ctxFw = canvasFw.getContext("2d");

    // Element Game & Quà
    const gameLayer = document.getElementById('game-layer');
    const gameScreen = document.getElementById('game-screen');
    const giftScreen = document.getElementById('gift-screen');
    const puzzleGrid = document.getElementById('puzzle-grid');
    const lixiTrigger = document.getElementById('lixi-trigger'); 

    let width, height;

    // ============================================================
    // 2. XỬ LÝ RESIZE
    // ============================================================
    function resizeAllCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvasBg.width = width; canvasBg.height = height;
        canvasFw.width = width; canvasFw.height = height;
    }
    window.addEventListener('resize', resizeAllCanvas);
    resizeAllCanvas();

    // ============================================================
    // 3. LOGIC MINIGAME XẾP HÌNH (HỖ TRỢ CẢM ỨNG MOBILE)
    // ============================================================
    const n = 3; 
    const gridSizePx = 300;
    const root = document.documentElement;
    root.style.setProperty('--n', n);
    root.style.setProperty('--grid-size', `${gridSizePx}px`);
    
    let pieces = [];
    let draggedPiece = null;
    let originalParent = null; // Lưu vị trí cũ để trả về nếu thả sai

    // Chạy game
    initPuzzle();
    
    // Auto-play nhạc
    document.body.addEventListener('click', () => {
        if(audioMain.paused) {
            audioMain.volume = 0.5;
            audioMain.play().catch(()=>{});
        }
    }, { once: true });

    function initPuzzle() {
        // Tạo ô dropzone (Ô chứa)
        for(let r=0; r<n; r++) {
            for(let c=0; c<n; c++) {
                const dz = document.createElement('div');
                dz.classList.add('puzzle-dropzone');
                dz.dataset.r = r; dz.dataset.c = c;
                // Setup drop cho máy tính
                setupDropzoneDesktop(dz);
                puzzleGrid.appendChild(dz);
                
                // Tạo mảnh ghép
                const p = document.createElement('div');
                p.classList.add('puzzle-piece');
                p.draggable = true;
                p.dataset.correctR = r; p.dataset.correctC = c;
                const size = gridSizePx / n;
                p.style.backgroundPosition = `-${c*size}px -${r*size}px`;
                
                // Setup kéo thả (Cả Desktop & Mobile)
                setupPieceEvents(p);
                pieces.push(p);
            }
        }
        
        // Xáo trộn & Phân phát
        pieces.sort(() => Math.random() - 0.5);
        const leftContainer = document.getElementById('pieces-container-left');
        const rightContainer = document.getElementById('pieces-container-right');
        
        pieces.forEach((p, i) => {
            // Random góc xoay nhẹ
            p.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
            if(i % 2 === 0) leftContainer.appendChild(p);
            else rightContainer.appendChild(p);
        });
    }

    // --- XỬ LÝ SỰ KIỆN KÉO THẢ (QUAN TRỌNG) ---
    function setupPieceEvents(piece) {
        // 1. SỰ KIỆN CHUỘT (MÁY TÍNH)
        piece.addEventListener('dragstart', () => {
            if(piece.classList.contains('placed')) return;
            draggedPiece = piece;
            setTimeout(() => piece.classList.add('hidden'), 0);
        });
        piece.addEventListener('dragend', () => {
            draggedPiece = null;
            piece.classList.remove('hidden');
        });

        // 2. SỰ KIỆN CẢM ỨNG (MOBILE - FIX LỖI)
        
        // Khi bắt đầu chạm
        piece.addEventListener('touchstart', (e) => {
            if(piece.classList.contains('placed')) return;
            e.preventDefault(); // Ngăn cuộn màn hình khi chạm vào mảnh ghép
            
            draggedPiece = piece;
            originalParent = piece.parentElement; // Lưu nhà cũ

            // Chuyển sang chế độ "bay" (fixed positioning) để đi theo ngón tay
            piece.style.position = 'fixed';
            piece.style.zIndex = '1000';
            piece.style.width = (gridSizePx / n) + 'px'; // Giữ nguyên kích thước
            piece.style.height = (gridSizePx / n) + 'px';
            piece.style.pointerEvents = 'none'; // Để touch xuyên qua tìm dropzone bên dưới
            
            // Cập nhật vị trí ngay lập tức
            const touch = e.touches[0];
            movePieceToTouch(touch.clientX, touch.clientY, piece);
        }, { passive: false });

        // Khi di chuyển ngón tay
        piece.addEventListener('touchmove', (e) => {
            if(!draggedPiece) return;
            e.preventDefault(); // Cấm cuộn trang tuyệt đối
            const touch = e.touches[0];
            movePieceToTouch(touch.clientX, touch.clientY, draggedPiece);
        }, { passive: false });

        // Khi thả tay ra
        piece.addEventListener('touchend', (e) => {
            if(!draggedPiece) return;
            const touch = e.changedTouches[0]; // Vị trí ngón tay khi thả
            
            // Bật lại pointer-events để tương tác
            draggedPiece.style.pointerEvents = 'auto';

            // Tìm xem đang thả vào cái gì
            const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const dropzone = elemBelow ? elemBelow.closest('.puzzle-dropzone') : null;

            if (dropzone) {
                // Kiểm tra logic thả
                handleDropLogic(dropzone, draggedPiece);
            } else {
                // Thả ra ngoài -> Quay về chỗ cũ
                resetPieceStyle(draggedPiece);
            }
            draggedPiece = null;
        });
    }

    // Hàm di chuyển mảnh ghép theo ngón tay
    function movePieceToTouch(x, y, piece) {
        const w = parseFloat(piece.style.width);
        const h = parseFloat(piece.style.height);
        piece.style.left = (x - w / 2) + 'px'; // Căn giữa ngón tay
        piece.style.top = (y - h / 2) + 'px';
        piece.style.transform = 'scale(1.1)'; // Phóng to nhẹ khi cầm
    }

    // Hàm reset style khi thả xong hoặc thả sai
    function resetPieceStyle(piece) {
        piece.style.position = '';
        piece.style.zIndex = '';
        piece.style.left = '';
        piece.style.top = '';
        piece.style.transform = `rotate(${Math.random() * 10 - 5}deg)`; // Xoay nhẹ lại
        piece.style.width = ''; 
        piece.style.height = '';
    }

    // Setup Drop cho Desktop (DragOver/Drop)
    function setupDropzoneDesktop(dz) {
        dz.addEventListener('dragover', (e) => e.preventDefault());
        dz.addEventListener('drop', () => {
            if(!draggedPiece) return;
            handleDropLogic(dz, draggedPiece);
        });
    }

    // LOGIC CHUNG: KIỂM TRA ĐÚNG/SAI KHI THẢ
    function handleDropLogic(dropzone, piece) {
        const targetR = dropzone.dataset.r;
        const targetC = dropzone.dataset.c;
        const pieceR = piece.dataset.correctR;
        const pieceC = piece.dataset.correctC;

        // Nếu dropzone đã có mảnh ghép rồi thì không cho thả đè
        if (dropzone.hasChildNodes()) {
             resetPieceStyle(piece);
             return;
        }

        if(targetR === pieceR && targetC === pieceC) {
            // --- ĐÚNG VỊ TRÍ ---
            resetPieceStyle(piece); // Xóa style fixed của mobile
            dropzone.appendChild(piece); // Gắn vào ô
            
            piece.classList.add('placed'); // Đánh dấu đã xong
            piece.style.transform = 'none'; // Thẳng hàng
            piece.draggable = false; // Không cho kéo nữa
            
            checkWin();
        } else {
            // --- SAI VỊ TRÍ ---
            resetPieceStyle(piece); // Tự động quay về container cũ
        }
    }

    function checkWin() {
        const placed = document.querySelectorAll('.puzzle-piece.placed').length;
        if(placed === n*n) {
            setTimeout(() => {
                gameScreen.classList.add('hidden'); 
                giftScreen.classList.remove('hidden'); // Hiện Quà
                startContinuousFireworks(); // Ăn mừng
            }, 500);
        }
    }


    // ============================================================
    // 4. LOGIC HIỆU ỨNG & SỰ KIỆN (NHƯ CŨ)
    // ============================================================
    const objects = [];
    const objectsCount = 100; 
    const mouse = { x: -100, y: -100 };
    const minDist = 150; 
    const imgBase = new Image();
    imgBase.src = './images/snowflake.png';

    let imgLixi = null;
    let transitionProgress = 0; 
    let isTransforming = false;

    window.addEventListener('mousemove', function(e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseleave', function() { mouse.x = -100; mouse.y = -100; });

    for (let i = 0; i < objectsCount; i++) {
        let opacity = Math.random() * 0.4 + 0.6; 
        objects.push({
            x: Math.random() * width, y: Math.random() * height,
            size: (Math.floor(Math.random() * 20) + 20) * (opacity + 0.4), 
            baseSpeed: Math.random() * 0.5 + 0.3, 
            vY: Math.random() * 0.5 + 0.3, vX: 0,                           
            angle: Math.random() * 360, spin: Math.random() * 1 - 0.5,
            opacity: opacity
        });
    }

    function drawBackground() {
        ctxBg.clearRect(0, 0, width, height);
        objects.forEach(p => {
            let dx = p.x - mouse.x; let dy = p.y - mouse.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist) {
                let force = (minDist - dist) / minDist; 
                let angleToMouse = Math.atan2(dy, dx);
                let pushForce = 6 * force; 
                p.vX += Math.cos(angleToMouse) * pushForce * 0.1;
                p.vY += Math.sin(angleToMouse) * pushForce * 0.1;
            }
            p.x += p.vX; p.y += p.vY; p.angle += p.spin;
            p.vX *= 0.96; 
            if (p.vY < p.baseSpeed) p.vY += 0.02;
            else if (p.vY > p.baseSpeed && dist >= minDist) p.vY *= 0.98;

            if (p.y > height + 50) { p.y = -50; p.x = Math.random() * width; p.vY = p.baseSpeed; p.vX = 0; }
            if (p.x > width + 50) p.x = -50; if (p.x < -50) p.x = width + 50;

            ctxBg.save(); ctxBg.translate(p.x, p.y); ctxBg.rotate(p.angle * Math.PI / 180);
            if (transitionProgress < 1) {
                ctxBg.globalAlpha = p.opacity * (1 - transitionProgress);
                ctxBg.drawImage(imgBase, -p.size/2, -p.size/2, p.size, p.size);
            }
            if (imgLixi && transitionProgress > 0) {
                ctxBg.globalAlpha = p.opacity * transitionProgress;
                ctxBg.drawImage(imgLixi, -p.size/2, -p.size/2, p.size, p.size);
            }
            ctxBg.restore();
        });
        if (isTransforming && transitionProgress < 1) transitionProgress += 0.01;
        requestAnimationFrame(drawBackground);
    }
    imgBase.onload = () => { drawBackground(); };

    // --- SỰ KIỆN: LÌ XÌ -> THIỆP -> QUÀ ---
    function closeCardAndShowGift() {
        modal.classList.remove('open');
        cardPkg.classList.remove('is-open');
        gameLayer.style.display = 'flex'; 
        setTimeout(() => { gameLayer.style.opacity = '1'; }, 10);
    }

    lixiTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        gameLayer.style.opacity = '0';
        setTimeout(() => {
            gameLayer.style.display = 'none';
            modal.classList.add('open');
            audioMain.volume = 1.0;
            if(audioMain.paused) audioMain.play().catch(()=>{});
            
            imgLixi = new Image(); imgLixi.src = './images/lixi.png'; isTransforming = true; 
            startContinuousFireworks();
        }, 500);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-container')) { closeCardAndShowGift(); }
    });
    btnCloseCard.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeCardAndShowGift(); });
    btnOpenCard.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); cardPkg.classList.add('is-open'); startContinuousFireworks(); });

    // --- PHÁO HOA ---
    let fwParticles = []; let isFireworksRunning = false;
    function startContinuousFireworks() { if (isFireworksRunning) return; isFireworksRunning = true; animateFireworks(); }
    function createExplosion(x, y) {
        const colors = ['#ff0044', '#ffdd00', '#00ffcc', '#ff00ff', '#00ff00', '#ffffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 80; i++) {
            const angle = (Math.PI * 2) / 80 * i; const speed = Math.random() * 5 + 2;
            fwParticles.push({ x: x, y: y, color: color, velocity: { x: Math.cos(angle) * speed * Math.random(), y: Math.sin(angle) * speed * Math.random() }, alpha: 1, friction: 0.96, gravity: 0.03, life: 150 });
        }
    }
    function animateFireworks() {
        ctxFw.globalCompositeOperation = 'destination-out'; ctxFw.fillStyle = 'rgba(0, 0, 0, 0.1)'; ctxFw.fillRect(0, 0, width, height); ctxFw.globalCompositeOperation = 'source-over';
        if (Math.random() < 0.05) createExplosion(Math.random() * width, Math.random() * (height * 0.6));
        fwParticles.forEach((p, index) => {
            p.velocity.x *= p.friction; p.velocity.y *= p.friction; p.velocity.y += p.gravity; p.x += p.velocity.x; p.y += p.velocity.y; p.alpha -= 0.005;
            if (p.alpha <= 0) fwParticles.splice(index, 1);
            else { ctxFw.save(); ctxFw.globalAlpha = p.alpha; ctxFw.shadowBlur = 10; ctxFw.shadowColor = p.color; ctxFw.fillStyle = p.color; ctxFw.beginPath(); ctxFw.arc(p.x, p.y, 2, 0, Math.PI * 2); ctxFw.fill(); ctxFw.restore(); }
        });
        if (isFireworksRunning) requestAnimationFrame(animateFireworks);
    }
});