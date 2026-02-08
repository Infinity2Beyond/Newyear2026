document.addEventListener("DOMContentLoaded", function () {
    // ============================================================
    // 1. KHỞI TẠO CÁC BIẾN & ELEMENT
    // ============================================================
    
    // --- Các element của Thiệp & Hiệu ứng ---
    const modal = document.querySelector('.js-modal');
    const btnOpenCard = document.querySelector('.open');
    const btnCloseCard = document.querySelector('.close');
    const cardPkg = document.querySelector('.card-packaging');
    const audioMain = document.getElementById("AudioMain");

    // Canvas Nền (Hoa/Tuyết)
    const canvasBg = document.getElementById("canvas");
    const ctxBg = canvasBg.getContext("2d");

    // Canvas Pháo Hoa
    const canvasFw = document.getElementById("fireworks");
    const ctxFw = canvasFw.getContext("2d");

    // --- Các element của Game & Hộp quà ---
    const gameLayer = document.getElementById('game-layer');
    const gameScreen = document.getElementById('game-screen');
    const giftScreen = document.getElementById('gift-screen');
    const puzzleGrid = document.getElementById('puzzle-grid');
    const lixiTrigger = document.getElementById('lixi-trigger'); 

    // Biến chung
    let width, height;

    // ============================================================
    // 2. XỬ LÝ RESIZE
    // ============================================================
    function resizeAllCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;

        canvasBg.width = width;
        canvasBg.height = height;
        
        canvasFw.width = width;
        canvasFw.height = height;
    }
    window.addEventListener('resize', resizeAllCanvas);
    resizeAllCanvas();


    // ============================================================
    // 3. LOGIC MINIGAME XẾP HÌNH (PUZZLE)
    // ============================================================
    const n = 3; 
    const gridSizePx = 300;
    const root = document.documentElement;
    root.style.setProperty('--n', n);
    root.style.setProperty('--grid-size', `${gridSizePx}px`);
    
    let pieces = [];
    let draggedPiece = null;

    // Tự động chạy game khi vào trang
    initPuzzle();
    
    // Auto-play nhạc khi người dùng tương tác lần đầu
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
                setupDropzone(dz);
                puzzleGrid.appendChild(dz);
                
                const p = document.createElement('div');
                p.classList.add('puzzle-piece');
                p.draggable = true;
                p.dataset.correctR = r; p.dataset.correctC = c;
                const size = gridSizePx / n;
                p.style.backgroundPosition = `-${c*size}px -${r*size}px`;
                
                setupPiece(p);
                pieces.push(p);
            }
        }
        
        // Xáo trộn & Phân phát
        pieces.sort(() => Math.random() - 0.5);
        const leftContainer = document.getElementById('pieces-container-left');
        const rightContainer = document.getElementById('pieces-container-right');
        
        pieces.forEach((p, i) => {
            p.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
            if(i % 2 === 0) leftContainer.appendChild(p);
            else rightContainer.appendChild(p);
        });
    }

    function setupPiece(piece) {
        piece.addEventListener('dragstart', () => {
            draggedPiece = piece;
            setTimeout(() => piece.classList.add('hidden'), 0);
        });
        piece.addEventListener('dragend', () => {
            draggedPiece = null;
            piece.classList.remove('hidden');
        });
        piece.addEventListener('touchstart', () => { draggedPiece = piece; piece.style.opacity = '0.5'; });
        piece.addEventListener('touchend', () => { piece.style.opacity = '1'; });
    }

    function setupDropzone(dz) {
        dz.addEventListener('dragover', (e) => e.preventDefault());
        dz.addEventListener('drop', () => {
            if(!draggedPiece) return;
            const targetR = dz.dataset.r;
            const targetC = dz.dataset.c;
            const pieceR = draggedPiece.dataset.correctR;
            const pieceC = draggedPiece.dataset.correctC;

            if(targetR === pieceR && targetC === pieceC) {
                dz.appendChild(draggedPiece);
                draggedPiece.classList.add('placed');
                draggedPiece.draggable = false;
                draggedPiece.style.transform = 'none';
                checkWin();
            }
        });
    }

    function checkWin() {
        const placed = document.querySelectorAll('.puzzle-piece.placed').length;
        if(placed === n*n) {
            setTimeout(() => {
                gameScreen.classList.add('hidden'); 
                giftScreen.classList.remove('hidden'); // Hiện Hộp Quà
            }, 500);
        }
    }


    // ============================================================
    // 4. LOGIC HIỆU ỨNG NỀN (HOA RƠI -> LÌ XÌ)
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
    
    // --- Hàm đóng thiệp và hiện lại hộp quà ---
    function closeCardAndShowGift() {
        // 1. Đóng modal thiệp
        modal.classList.remove('open');
        cardPkg.classList.remove('is-open');

        // 2. Hiện lại lớp Game/Quà
        gameLayer.style.display = 'flex'; 
        // Dùng timeout nhỏ để transition opacity hoạt động mượt mà
        setTimeout(() => {
            gameLayer.style.opacity = '1';
        }, 10);
    }

    // --- Khi click vào Lì xì trong Hộp quà -> Mở thiệp ---
    lixiTrigger.addEventListener('click', (e) => {
        e.stopPropagation();

        // Ẩn lớp Game/Quà
        gameLayer.style.opacity = '0';
        setTimeout(() => {
            gameLayer.style.display = 'none';

            // Mở Modal Thiệp
            modal.classList.add('open');
            audioMain.volume = 1.0;
            if(audioMain.paused) audioMain.play().catch(()=>{});

            // Kích hoạt hiệu ứng biến hình & pháo hoa
            imgLixi = new Image(); 
            imgLixi.src = './images/lixi.png'; 
            isTransforming = true; 
            startContinuousFireworks();
        }, 500);
    });

    // --- Click ra vùng xám ngoài thiệp -> Đóng thiệp & Hiện quà ---
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-container')) {
            closeCardAndShowGift();
        }
    });

    // --- Click nút X đóng thiệp -> Đóng thiệp & Hiện quà ---
    btnCloseCard.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        closeCardAndShowGift();
    });

    // --- Nút Mở trên thiệp (Con dấu) ---
    btnOpenCard.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        cardPkg.classList.add('is-open');
        startContinuousFireworks();
    });


    // ============================================================
    // 6. LOGIC PHÁO HOA
    // ============================================================
    let fwParticles = []; 
    let isFireworksRunning = false;

    function startContinuousFireworks() {
        if (isFireworksRunning) return;
        isFireworksRunning = true;
        animateFireworks();
    }

    function createExplosion(x, y) {
        const colors = ['#ff0044', '#ffdd00', '#00ffcc', '#ff00ff', '#00ff00', '#ffffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 80; i++) {
            const angle = (Math.PI * 2) / 80 * i; const speed = Math.random() * 5 + 2;
            fwParticles.push({
                x: x, y: y, color: color,
                velocity: { x: Math.cos(angle) * speed * Math.random(), y: Math.sin(angle) * speed * Math.random() },
                alpha: 1, friction: 0.96, gravity: 0.03, life: 150
            });
        }
    }

    function animateFireworks() {
        ctxFw.globalCompositeOperation = 'destination-out';
        ctxFw.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
        ctxFw.fillRect(0, 0, width, height); 
        ctxFw.globalCompositeOperation = 'source-over';

        if (Math.random() < 0.05) createExplosion(Math.random() * width, Math.random() * (height * 0.6));
        
        fwParticles.forEach((p, index) => {
            p.velocity.x *= p.friction; p.velocity.y *= p.friction; p.velocity.y += p.gravity;
            p.x += p.velocity.x; p.y += p.velocity.y; p.alpha -= 0.005;
            
            if (p.alpha <= 0) fwParticles.splice(index, 1);
            else {
                ctxFw.save(); 
                ctxFw.globalAlpha = p.alpha; 
                ctxFw.shadowBlur = 10; 
                ctxFw.shadowColor = p.color;
                ctxFw.fillStyle = p.color; 
                ctxFw.beginPath(); 
                ctxFw.arc(p.x, p.y, 2, 0, Math.PI * 2); 
                ctxFw.fill(); 
                ctxFw.restore();
            }
        });
        
        if (isFireworksRunning) requestAnimationFrame(animateFireworks);
    }
});