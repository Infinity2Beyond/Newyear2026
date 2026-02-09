document.addEventListener("DOMContentLoaded", function () {
    // ============================================================
    // 1. KHỞI TẠO CÁC BIẾN & ELEMENT
    // ============================================================
    const modal = document.querySelector('.js-modal');
    const btnOpenCard = document.querySelector('.open');
    const btnCloseCard = document.querySelector('.close');
    const cardPkg = document.querySelector('.card-packaging');
    const audioMain = document.getElementById("AudioMain");

    const canvasBg = document.getElementById("canvas");
    const ctxBg = canvasBg.getContext("2d");
    const canvasFw = document.getElementById("fireworks");
    const ctxFw = canvasFw.getContext("2d");

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
    // 3. LOGIC MINIGAME (PHƯƠNG PHÁP BOUNDING BOX - FIX TRIỆT ĐỂ)
    // ============================================================
    const n = 3; 
    const gridSizePx = 300;
    const root = document.documentElement;
    root.style.setProperty('--n', n);
    root.style.setProperty('--grid-size', `${gridSizePx}px`);
    
    let pieces = [];
    let draggedPiece = null;
    let originalParent = null; 

    initPuzzle();
    
    document.body.addEventListener('click', () => {
        if(audioMain.paused) {
            audioMain.volume = 0.5;
            audioMain.play().catch(()=>{});
        }
    }, { once: true });

    function initPuzzle() {
        for(let r=0; r<n; r++) {
            for(let c=0; c<n; c++) {
                const dz = document.createElement('div');
                dz.classList.add('puzzle-dropzone');
                dz.dataset.r = r; dz.dataset.c = c;
                dz.id = `dropzone-${r}-${c}`;
                setupDropzoneDesktop(dz);
                puzzleGrid.appendChild(dz);
                
                const p = document.createElement('div');
                p.classList.add('puzzle-piece');
                p.draggable = true;
                p.dataset.correctR = r; p.dataset.correctC = c;
                const size = gridSizePx / n;
                p.style.backgroundPosition = `-${c*size}px -${r*size}px`;
                
                setupPieceEvents(p);
                pieces.push(p);
            }
        }
        
        pieces.sort(() => Math.random() - 0.5);
        const leftContainer = document.getElementById('pieces-container-left');
        const rightContainer = document.getElementById('pieces-container-right');
        
        pieces.forEach((p, i) => {
            p.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
            if(i % 2 === 0) leftContainer.appendChild(p);
            else rightContainer.appendChild(p);
        });
    }

    function getDropzoneAtPoint(x, y) {
        const dropzones = document.querySelectorAll('.puzzle-dropzone');
        for (let dz of dropzones) {
            const rect = dz.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right &&
                y >= rect.top && y <= rect.bottom) {
                return dz;
            }
        }
        return null;
    }

    function setupPieceEvents(piece) {
        // --- DESKTOP ---
        piece.addEventListener('dragstart', () => {
            if(piece.classList.contains('placed')) return;
            draggedPiece = piece;
            setTimeout(() => piece.classList.add('hidden'), 0);
        });
        piece.addEventListener('dragend', () => {
            draggedPiece = null;
            piece.classList.remove('hidden');
        });

        // --- MOBILE (TOUCH) ---
        piece.addEventListener('touchstart', (e) => {
            if(piece.classList.contains('placed')) return;
            if(e.cancelable) e.preventDefault();
            
            draggedPiece = piece;
            originalParent = piece.parentElement;

            document.body.appendChild(piece); 

            piece.style.position = 'fixed';
            piece.style.zIndex = '999999';
            piece.style.width = (gridSizePx / n) + 'px';
            piece.style.height = (gridSizePx / n) + 'px';
            piece.style.transform = 'scale(1.1)'; 
            piece.style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)';

            const touch = e.touches[0];
            movePieceToTouch(touch.clientX, touch.clientY, piece);
        }, { passive: false }); 

        piece.addEventListener('touchmove', (e) => {
            if(!draggedPiece) return;
            if(e.cancelable) e.preventDefault(); 

            const touch = e.touches[0];
            movePieceToTouch(touch.clientX, touch.clientY, draggedPiece);
        }, { passive: false });

        piece.addEventListener('touchend', (e) => {
            if(!draggedPiece) return;
            
            const touch = e.changedTouches[0];
            const dropzone = getDropzoneAtPoint(touch.clientX, touch.clientY);

            if (dropzone) {
                handleDropLogic(dropzone, draggedPiece);
            } else {
                returnToOriginal(draggedPiece);
            }
            draggedPiece = null;
        });
    }

    function movePieceToTouch(x, y, piece) {
        const w = parseFloat(piece.style.width);
        const h = parseFloat(piece.style.height);
        piece.style.left = (x - w / 2) + 'px';
        piece.style.top = (y - h / 2) + 'px';
    }

    function returnToOriginal(piece) {
        piece.style.position = '';
        piece.style.zIndex = '';
        piece.style.left = '';
        piece.style.top = '';
        piece.style.width = ''; 
        piece.style.height = '';
        piece.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
        piece.style.boxShadow = 'none';
        
        if(originalParent) originalParent.appendChild(piece);
    }

    function setupDropzoneDesktop(dz) {
        dz.addEventListener('dragover', (e) => e.preventDefault());
        dz.addEventListener('drop', () => {
            if(!draggedPiece) return;
            handleDropLogic(dz, draggedPiece);
        });
    }

    function handleDropLogic(dropzone, piece) {
        const targetR = dropzone.dataset.r;
        const targetC = dropzone.dataset.c;
        const pieceR = piece.dataset.correctR;
        const pieceC = piece.dataset.correctC;

        if (dropzone.hasChildNodes() || targetR !== pieceR || targetC !== pieceC) {
             if (piece.style.position === 'fixed') {
                returnToOriginal(piece);
             }
             return;
        }

        piece.style.position = '';
        piece.style.zIndex = '';
        piece.style.left = '';
        piece.style.top = '';
        piece.style.width = '100%'; 
        piece.style.height = '100%';
        piece.style.transform = 'none';
        piece.style.boxShadow = 'none';
        
        piece.draggable = false;
        piece.classList.add('placed');
        
        dropzone.appendChild(piece); 
        checkWin();
    }

    function checkWin() {
        const placed = document.querySelectorAll('.puzzle-piece.placed').length;
        if(placed === n*n) {
            setTimeout(() => {
                gameScreen.classList.add('hidden'); 
                giftScreen.classList.remove('hidden'); 
                startContinuousFireworks();
            }, 500);
        }
    }

    let isTyping = false; // Cờ kiểm tra để không gõ lại nhiều lần

    function typeWriter() {
        const element = document.getElementById('poem');
        if (!element || isTyping) return; // Nếu đang gõ hoặc gõ rồi thì thôi
        
        isTyping = true;
        const text = element.getAttribute('data-text');
        element.innerHTML = ""; // Xóa sạch trước khi gõ
        
        let i = 0;
        const speed = 50; // Tốc độ gõ (càng nhỏ càng nhanh)

        function typing() {
            if (i < text.length) {
                let char = text.charAt(i);
                // Nếu gặp dấu | thì đổi thành thẻ xuống dòng <br>
                if (char === '|') {
                    element.innerHTML += "<br>";
                } else {
                    element.innerHTML += char;
                }
                i++;
                setTimeout(typing, speed);
            }
        }
        typing();
    }


    // ============================================================
    // 4. LOGIC HIỆU ỨNG NỀN & SỰ KIỆN
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


    // ============================================================
    // 5. XỬ LÝ SỰ KIỆN: ĐÓNG/MỞ THIỆP & HỘP QUÀ
    // ============================================================
    
    // --- Hàm này chỉ dùng khi click ra ngoài vùng thiệp (thoát hẳn) ---
    function closeCardAndShowGift() {
        cardPkg.classList.remove('is-open');
        // Đợi 1s cho animation đóng thiệp rồi mới ẩn modal
        setTimeout(() => {
            modal.classList.remove('open');
            // Hiện lại lớp Game/Quà
            gameLayer.style.display = 'flex'; 
            setTimeout(() => { gameLayer.style.opacity = '1'; }, 10);
        }, 1000); 
    }

    // --- Khi click Lì xì -> Mở thiệp ---
    lixiTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        gameLayer.style.opacity = '0';
        setTimeout(() => {
            gameLayer.style.display = 'none';
            modal.classList.add('open');
            // setTimeout(typeWriter, 500)
            audioMain.volume = 1.0;
            if(audioMain.paused) audioMain.play().catch(()=>{});
            imgLixi = new Image(); imgLixi.src = './images/lixi.png'; isTransforming = true; 
            startContinuousFireworks();
        }, 500);
    });

    // --- CLICK RA NGOÀI VÙNG XÁM -> THOÁT RA HỘP QUÀ ---
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-container')) { 
            closeCardAndShowGift(); 
        }
    });

    // --- CLICK NÚT X (SỬA LẠI: CHỈ ĐÓNG NẮP THIỆP) ---
    btnCloseCard.addEventListener('click', (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        // Chỉ gập thiệp lại (không gọi hàm closeCardAndShowGift để tránh biến mất modal)
        cardPkg.classList.remove('is-open'); 
    });

    // --- Nút Mở (Con dấu) ---
    btnOpenCard.addEventListener('click', (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        cardPkg.classList.add('is-open'); 
        startContinuousFireworks(); 
        setTimeout(typeWriter, 500)
    });


    // --- PHÁO HOA ---
    let fwParticles = []; let isFireworksRunning = false;
    function startContinuousFireworks() { if (isFireworksRunning) return; isFireworksRunning = true; animateFireworks(); }
    function createExplosion(x, y) {
        const colors = ['#ff0044', '#ffdd00', '#00ffcc', '#ff00ff', '#00ff00', '#ffffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 80; i++) {
            const angle = (Math.PI * 2) / 80 * i; const speed = Math.random() * 2 + 1; 
            fwParticles.push({ x: x, y: y, color: color, velocity: { x: Math.cos(angle) * speed * Math.random(), y: Math.sin(angle) * speed * Math.random() }, alpha: 1, friction: 0.96, gravity: 0.03, life: 150 });
        }
    }
    function animateFireworks() {
        ctxFw.globalCompositeOperation = 'destination-out'; ctxFw.fillStyle = 'rgba(0, 0, 0, 0.1)'; ctxFw.fillRect(0, 0, width, height); ctxFw.globalCompositeOperation = 'source-over';
        if (Math.random() < 0.03) createExplosion(Math.random() * width, Math.random() * (height * 0.6));
        fwParticles.forEach((p, index) => {
            p.velocity.x *= p.friction; p.velocity.y *= p.friction; p.velocity.y += p.gravity; p.x += p.velocity.x; p.y += p.velocity.y; p.alpha -= 0.01;
            if (p.alpha <= 0) fwParticles.splice(index, 1);
            else { ctxFw.save(); ctxFw.globalAlpha = p.alpha; ctxFw.shadowBlur = 10; ctxFw.shadowColor = p.color; ctxFw.fillStyle = p.color; ctxFw.beginPath(); ctxFw.arc(p.x, p.y, 2, 0, Math.PI * 2); ctxFw.fill(); ctxFw.restore(); }
        });
        if (isFireworksRunning) requestAnimationFrame(animateFireworks);
    }

    // ============================================================
    // 7. TÍNH NĂNG QUÀ ẨN (DOUBLE CLICK TRÁI TIM)
    // ============================================================
    const heartBtn = document.getElementById('heart');
    const hiddenPopup = document.getElementById('hidden-gift-popup');
    const giftResult = document.getElementById('gift-result');
    const closeGiftBtn = document.getElementById('close-gift-btn');

    // Danh sách quà "bựa" hoặc đặc biệt hơn lì xì thường
    const secretGifts = [
        "Một cái ôm thắm thiết❤️",
        "Phiếu Bé Ngoan trọn đời!",
        "🤡Chúc may mắn lần sau!",
        "1 chuyến du lịch qua màn ảnh nhỏ",
        "Tình yêu siêu to khổng lồ!",
        "999 đóa hồng🌹🌹🌹",
        "Một cái ôm ấm áp!"
    ];

    // Sự kiện Click đúp (dblclick)
    heartBtn.addEventListener('dblclick', (e) => {
        e.stopPropagation(); // Ngăn sự kiện lan ra làm đóng thiệp
        e.preventDefault();  // Ngăn bôi đen trúng tim
        
        // Random quà
        const randomGift = secretGifts[Math.floor(Math.random() * secretGifts.length)];
        giftResult.innerText = randomGift;
        
        // Hiện popup quà ẩn
        hiddenPopup.classList.remove('hidden');
        
        // Hiệu ứng pháo hoa chúc mừng thêm lần nữa
        startContinuousFireworks();
    });

    // Đóng popup quà ẩn
    closeGiftBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hiddenPopup.classList.add('hidden');
    });

    // Click ra ngoài popup cũng đóng
    hiddenPopup.addEventListener('click', (e) => {
        if (e.target === hiddenPopup) {
            hiddenPopup.classList.add('hidden');
        }
    });

});