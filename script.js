// ゲームの状態を管理する変数
let gameRunning = false;
let score = 0;
let kills = 0;
let timeLeft = 60;
let timer;
let cockroaches = [];
let lastSpawnTime = 0;
let spawnInterval = 2000; // ゴキブリが出現する間隔（ミリ秒）- 遅くした
let canvas, ctx;
let canvasWidth, canvasHeight;
let splats = []; // 退治したゴキブリの跡
let whiteFluids = []; // ゴキブリから出る白い液体
let footprints = []; // ゴキブリの足跡
let gameOverSound, hitSound, missSound, bgMusic;
let kitchenBgImg; // キッチン背景画像
let lastFrameTime = 0; // 前回のフレーム時間
let isMobile = false; // モバイルデバイス判定
let canvasScale = 1; // キャンバススケール（タッチポイント変換用）

// モバイルデバイス判定
function checkMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 800;
}

// 画像のロード
const cockroachImg = new Image();
cockroachImg.src = 'images/cockroach.svg';

const splatImg = new Image();
splatImg.src = 'images/splat.svg';

const sprayImg = new Image();
sprayImg.src = 'images/spray.svg';

// キッチン背景画像のロード
kitchenBgImg = new Image();
kitchenBgImg.src = 'images/kitchen_background.svg';

// 音声のロード
function loadSounds() {
    // 音声ファイルがない場合のエラーを防ぐためのダミー関数
    gameOverSound = {
        play: function() { console.log('Game over sound would play here'); },
        pause: function() { console.log('Game over sound would pause here'); }
    };
    hitSound = {
        play: function() { console.log('Hit sound would play here'); },
        currentTime: 0
    };
    missSound = {
        play: function() { console.log('Miss sound would play here'); },
        currentTime: 0
    };
    bgMusic = {
        play: function() { console.log('Background music would play here'); },
        pause: function() { console.log('Background music would pause here'); },
        currentTime: 0,
        loop: true,
        volume: 0.5
    };
    
    // 実際の音声ファイルがある場合は、以下のコードを使用
    try {
        gameOverSound = new Audio('sounds/game_over.mp3');
        hitSound = new Audio('sounds/hit.mp3');
        missSound = new Audio('sounds/miss.mp3');
        bgMusic = new Audio('sounds/background_music.mp3');
        bgMusic.loop = true;
        bgMusic.volume = 0.5;
    } catch (e) {
        console.log('音声ファイルの読み込みに失敗しました:', e);
    }
}

// キャンバスのリサイズ処理
function resizeCanvas() {
    // キャンバスのサイズを設定
    const container = document.querySelector('.game-container');
    const containerWidth = container.clientWidth - 40; // padding分を引く
    
    // キャンバスの実際のサイズを設定
    canvas.width = containerWidth;
    canvas.height = Math.min(containerWidth * 0.75, window.innerHeight * 0.6);
    
    // 描画コンテキストのサイズを保存
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    
    // モバイルデバイスの場合、タッチポイント変換用のスケールを計算
    canvasScale = canvas.width / canvas.offsetWidth;
    
    // 初期画面を再描画
    if (!gameRunning) {
        drawInitialScreen();
    }
}

// ゲーム初期化
function initGame() {
    // モバイルデバイス判定
    isMobile = checkMobile();
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // キャンバスのリサイズ
    resizeCanvas();
    
    // ウィンドウリサイズ時にキャンバスもリサイズ
    window.addEventListener('resize', resizeCanvas);
    
    // イベントリスナーの設定
    canvas.addEventListener('click', handleCanvasClick);
    
    // モバイル端末用のタッチイベント
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    
    // モバイル端末の場合、音声は最初にユーザーインタラクションが必要
    if (isMobile) {
        document.getElementById('startButton').addEventListener('click', function() {
            // ダミーの音声を再生してオーディオコンテキストをアンロック
            try {
                const unlockAudio = new Audio();
                unlockAudio.play().catch(() => {});
            } catch(e) {}
        });
    }
    
    // 音声のロード
    loadSounds();
    
    // 初期描画
    drawInitialScreen();
    
    // モバイル端末の場合、説明テキストを追加
    if (isMobile) {
        const touchInfo = document.createElement('div');
        touchInfo.className = 'touch-info';
        touchInfo.innerHTML = 'スマホでプレイする場合は画面をタップしてゴキブリを退治してください';
        document.querySelector('.game-container').appendChild(touchInfo);
    }
}

// タッチイベントハンドラ
function handleTouchStart(event) {
    event.preventDefault(); // デフォルトの挙動を防止
    if (!gameRunning) return;
    
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = (touch.clientX - rect.left);
    const touchY = (touch.clientY - rect.top);
    
    // タッチした位置でクリックイベントを発火
    processInteraction(touchX, touchY);
}

function handleTouchMove(event) {
    event.preventDefault(); // デフォルトの挙動を防止
}

function handleTouchEnd(event) {
    event.preventDefault(); // デフォルトの挙動を防止
}

// 初期画面の描画
function drawInitialScreen() {
    // 背景画像を描画
    if (kitchenBgImg.complete) {
        ctx.drawImage(kitchenBgImg, 0, 0, canvasWidth, canvasHeight);
    } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        kitchenBgImg.onload = function() {
            ctx.drawImage(kitchenBgImg, 0, 0, canvasWidth, canvasHeight);
            drawInitialText();
        };
    }
    
    drawInitialText();
}

// 初期画面のテキスト描画
function drawInitialText() {
    // モバイル端末の場合はフォントサイズを調整
    const titleSize = isMobile ? 24 : 30;
    const textSize = isMobile ? 16 : 20;
    
    // 背景を少し暗く
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(canvasWidth / 2 - canvasWidth * 0.4, canvasHeight / 2 - canvasHeight * 0.2, canvasWidth * 0.8, canvasHeight * 0.4);
    
    ctx.fillStyle = 'white';
    ctx.font = `${titleSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('ゴキブリ退治ゲーム', canvasWidth / 2, canvasHeight / 2 - canvasHeight * 0.1);
    
    ctx.font = `${textSize}px Arial`;
    ctx.fillText('「ゲーム開始」ボタンをクリックしてスタート', canvasWidth / 2, canvasHeight / 2);
    ctx.fillText(isMobile ? 'ゴキブリをタップして退治しよう！' : 'ゴキブリをクリックして退治しよう！', canvasWidth / 2, canvasHeight / 2 + canvasHeight * 0.1);
}

// ゲーム開始
function startGame() {
    if (gameRunning) return;
    
    // モバイル端末の場合は説明テキストを非表示
    const touchInfo = document.querySelector('.touch-info');
    if (touchInfo) {
        touchInfo.style.display = 'none';
    }
    
    gameRunning = true;
    score = 0;
    kills = 0;
    timeLeft = 60;
    cockroaches = [];
    splats = [];
    whiteFluids = [];
    footprints = [];
    
    // UI更新
    updateUI();
    
    // スタートボタンを非表示、リスタートボタンを表示
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('restartButton').style.display = 'inline-block';
    
    // ゲームオーバー画面を非表示
    document.getElementById('gameOver').style.display = 'none';
    
    // BGM再生
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log('BGM再生エラー:', e)); // モバイル対応
    
    // タイマー開始
    timer = setInterval(() => {
        timeLeft--;
        updateUI();
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
    
    // ゲームループ開始
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// ゲーム再スタート
function restartGame() {
    if (gameRunning) return;
    startGame();
}

// ゲーム終了
function endGame() {
    gameRunning = false;
    clearInterval(timer);
    
    // BGM停止
    bgMusic.pause();
    
    // ゲームオーバー音再生
    gameOverSound.play().catch(e => console.log('ゲームオーバー音再生エラー:', e)); // モバイル対応
    
    // 最終スコアの表示
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalKills').textContent = kills;
    document.getElementById('gameOver').style.display = 'block';
}

// UI更新
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('time').textContent = timeLeft;
    document.getElementById('kills').textContent = kills;
}

// ゲームループ
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    // デルタタイム（前回のフレームからの経過時間）を計算
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    // 背景画像を描画
    if (kitchenBgImg.complete) {
        ctx.drawImage(kitchenBgImg, 0, 0, canvasWidth, canvasHeight);
    } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // 足跡の描画
    drawFootprints();
    
    // ゴキブリの生成
    if (timestamp - lastSpawnTime > spawnInterval) {
        spawnCockroach();
        lastSpawnTime = timestamp;
        
        // ゲームが進むにつれて出現間隔を短くする（ただし最低でも1000ms）
        spawnInterval = Math.max(1000, 2000 - (kills * 5));
        
        // モバイル端末の場合はゴキブリの数を制限（パフォーマンス対策）
        if (isMobile && cockroaches.length > 10) {
            // 最も古いゴキブリを削除
            cockroaches.shift();
        }
    }
    
    // 白い液体の更新と描画
    updateAndDrawWhiteFluids(deltaTime);
    
    // 退治跡の描画
    drawSplats();
    
    // ゴキブリの更新と描画
    updateAndDrawCockroaches(deltaTime);
    
    // 次のフレームを要求
    requestAnimationFrame(gameLoop);
}

// ゴキブリの生成
function spawnCockroach() {
    // モバイル端末の場合はサイズを少し大きくする（タップしやすくするため）
    const baseSize = isMobile ? 50 : 40;
    const size = baseSize + Math.random() * 20; // サイズをランダムに
    const speed = 0.5 + Math.random() * 1.5; // 速度を遅くした
    
    // 出現位置をランダムに決定（画面の端から）
    let x, y, directionX, directionY;
    
    if (Math.random() < 0.5) {
        // 左右の端から
        x = Math.random() < 0.5 ? -size : canvasWidth;
        y = Math.random() * canvasHeight;
        directionX = x < 0 ? speed : -speed;
        directionY = (Math.random() - 0.5) * speed * 0.5;
    } else {
        // 上下の端から
        x = Math.random() * canvasWidth;
        y = Math.random() < 0.5 ? -size : canvasHeight;
        directionX = (Math.random() - 0.5) * speed * 0.5;
        directionY = y < 0 ? speed : -speed;
    }
    
    // 回転角度をランダムに
    const rotation = Math.random() * Math.PI * 2;
    
    // 足の動きのアニメーション用のパラメータ
    const legSpeed = 0.1 + Math.random() * 0.1;
    const legPhase = Math.random() * Math.PI * 2;
    
    // 一時停止の確率
    const pauseProbability = 0.001 + Math.random() * 0.002;
    
    cockroaches.push({
        x,
        y,
        size,
        directionX,
        directionY,
        speed,
        rotation,
        rotationSpeed: (Math.random() - 0.5) * 0.05, // 回転速度も遅くした
        alive: true,
        legSpeed,
        legPhase,
        pauseProbability,
        isPaused: false,
        pauseTime: 0,
        pauseDuration: 0,
        lastFootprintTime: 0,
        footprintInterval: 300 + Math.random() * 500 // 足跡を残す間隔
    });
}

// ゴキブリの更新と描画
function updateAndDrawCockroaches(deltaTime) {
    for (let i = cockroaches.length - 1; i >= 0; i--) {
        const roach = cockroaches[i];
        
        if (!roach.alive) {
            // 死んだゴキブリは配列から削除
            cockroaches.splice(i, 1);
            continue;
        }
        
        // 一時停止の処理
        if (roach.isPaused) {
            roach.pauseTime += deltaTime;
            if (roach.pauseTime >= roach.pauseDuration) {
                roach.isPaused = false;
                
                // 停止後に方向を少し変える
                const angle = Math.random() * Math.PI * 2;
                roach.directionX = Math.cos(angle) * roach.speed;
                roach.directionY = Math.sin(angle) * roach.speed;
            }
        } else {
            // ランダムに一時停止する
            if (Math.random() < roach.pauseProbability) {
                roach.isPaused = true;
                roach.pauseTime = 0;
                roach.pauseDuration = 500 + Math.random() * 1500; // 0.5〜2秒間停止
            } else {
                // 位置の更新
                roach.x += roach.directionX;
                roach.y += roach.directionY;
                
                // 回転の更新
                roach.rotation += roach.rotationSpeed;
                
                // 足跡を残す（モバイル端末の場合は頻度を下げる）
                roach.lastFootprintTime += deltaTime;
                if (roach.lastFootprintTime > roach.footprintInterval) {
                    // モバイル端末の場合は足跡の数を制限
                    if (!isMobile || footprints.length < 50) {
                        addFootprint(roach.x, roach.y, roach.size * 0.2);
                    }
                    roach.lastFootprintTime = 0;
                }
                
                // 画面外に出たら削除
                if (roach.x < -roach.size * 2 || roach.x > canvasWidth + roach.size * 2 ||
                    roach.y < -roach.size * 2 || roach.y > canvasHeight + roach.size * 2) {
                    cockroaches.splice(i, 1);
                    continue;
                }
                
                // 方向転換（ランダム）- 頻度を下げた
                if (Math.random() < 0.005) {
                    // 急な方向転換
                    if (Math.random() < 0.2) {
                        // 90度近い角度で曲がる
                        const currentAngle = Math.atan2(roach.directionY, roach.directionX);
                        const turnAngle = (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 4);
                        const newAngle = currentAngle + turnAngle;
                        
                        roach.directionX = Math.cos(newAngle) * roach.speed;
                        roach.directionY = Math.sin(newAngle) * roach.speed;
                    } else {
                        // 通常の方向転換
                        roach.directionX += (Math.random() - 0.5) * 0.3;
                        roach.directionY += (Math.random() - 0.5) * 0.3;
                        
                        // 速度の正規化
                        const speed = Math.sqrt(roach.directionX * roach.directionX + roach.directionY * roach.directionY);
                        if (speed > 0) {
                            roach.directionX = (roach.directionX / speed) * roach.speed;
                            roach.directionY = (roach.directionY / speed) * roach.speed;
                        }
                    }
                }
            }
        }
        
        // ゴキブリの描画
        ctx.save();
        ctx.translate(roach.x, roach.y);
        
        // 移動方向に合わせて回転
        if (!roach.isPaused) {
            const moveAngle = Math.atan2(roach.directionY, roach.directionX);
            ctx.rotate(moveAngle + Math.PI / 2);
        } else {
            ctx.rotate(roach.rotation);
        }
        
        // 足の動きをシミュレート（停止中は動かさない）
        if (!roach.isPaused) {
            // 足の動きを表現するための小さな揺れを追加
            const legAnimation = Math.sin(performance.now() * roach.legSpeed + roach.legPhase) * 0.1;
            ctx.rotate(legAnimation);
        }
        
        // ゴキブリの本体を描画
        ctx.drawImage(cockroachImg, -roach.size / 2, -roach.size / 2, roach.size, roach.size);
        ctx.restore();
    }
}

// 足跡の追加
function addFootprint(x, y, size) {
    footprints.push({
        x,
        y,
        size,
        opacity: 0.05 + Math.random() * 0.05,
        life: 1.0
    });
    
    // 足跡の数を制限（パフォーマンス対策）
    if (footprints.length > 100) {
        footprints.shift();
    }
}

// 足跡の描画
function drawFootprints() {
    // 足跡の寿命を減らす
    for (let i = footprints.length - 1; i >= 0; i--) {
        const footprint = footprints[i];
        footprint.life -= 0.0005;
        
        if (footprint.life <= 0) {
            footprints.splice(i, 1);
            continue;
        }
        
        // 足跡を描画
        ctx.fillStyle = `rgba(0, 0, 0, ${footprint.opacity * footprint.life})`;
        ctx.beginPath();
        ctx.arc(footprint.x, footprint.y, footprint.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 白い液体の更新と描画
function updateAndDrawWhiteFluids(deltaTime) {
    for (let i = whiteFluids.length - 1; i >= 0; i--) {
        const fluid = whiteFluids[i];
        
        // 寿命の更新
        fluid.life -= 0.01;
        
        // 寿命が尽きたら削除
        if (fluid.life <= 0) {
            whiteFluids.splice(i, 1);
            continue;
        }
        
        // 位置の更新
        fluid.x += fluid.directionX;
        fluid.y += fluid.directionY;
        
        // 重力の影響を追加
        fluid.directionY += 0.05;
        
        // 白い液体の描画
        ctx.fillStyle = `rgba(255, 255, 255, ${fluid.life})`;
        ctx.beginPath();
        ctx.arc(fluid.x, fluid.y, fluid.size * fluid.life, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 液体の数を制限（パフォーマンス対策）
    if (whiteFluids.length > 100) {
        whiteFluids.splice(0, whiteFluids.length - 100);
    }
}

// 退治跡の描画
function drawSplats() {
    for (const splat of splats) {
        ctx.drawImage(splatImg, splat.x - splat.size / 2, splat.y - splat.size / 2, splat.size, splat.size);
    }
    
    // スプラットの数を制限（パフォーマンス対策）
    if (splats.length > 20) {
        splats.splice(0, splats.length - 20);
    }
}

// キャンバスクリックの処理
function handleCanvasClick(event) {
    if (!gameRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // クリック位置を処理
    processInteraction(clickX, clickY);
}

// インタラクション処理（クリックまたはタップ）
function processInteraction(x, y) {
    // スプレーのエフェクト表示
    showSprayEffect(x, y);
    
    let hit = false;
    
    // クリック位置とゴキブリの当たり判定 - 当たり判定を大きくした
    for (let i = cockroaches.length - 1; i >= 0; i--) {
        const roach = cockroaches[i];
        const distance = Math.sqrt(
            Math.pow(x - roach.x, 2) + 
            Math.pow(y - roach.y, 2)
        );
        
        // モバイル端末の場合は当たり判定をさらに大きくする
        const hitRadius = isMobile ? roach.size * 0.9 : roach.size * 0.7;
        
        if (distance < hitRadius) { // 当たり判定を大きくした
            // ヒット
            hit = true;
            roach.alive = false;
            
            // スコアと退治数の更新
            score += Math.floor(100 / (roach.size / 40)); // 小さいゴキブリほど高得点
            kills++;
            updateUI();
            
            // 退治跡の追加
            splats.push({
                x: roach.x,
                y: roach.y,
                size: roach.size * 1.2
            });
            
            // 白い液体の追加（死亡時）
            createWhiteFluid(roach.x, roach.y, roach.size);
            
            // 死亡時の足の痙攣エフェクト（モバイル端末の場合は簡略化）
            if (!isMobile) {
                createDeathTwitches(roach.x, roach.y, roach.size);
            }
            
            // ヒット音再生
            hitSound.currentTime = 0;
            hitSound.play().catch(e => console.log('ヒット音再生エラー:', e)); // モバイル対応
            
            break;
        }
    }
    
    if (!hit) {
        // ミス音再生
        missSound.currentTime = 0;
        missSound.play().catch(e => console.log('ミス音再生エラー:', e)); // モバイル対応
    }
}

// 死亡時の足の痙攣エフェクト
function createDeathTwitches(x, y, size) {
    // モバイル端末の場合は痙攣エフェクトを簡略化
    const twitchCount = isMobile ? 3 : 6;
    
    // 死亡時の足の痙攣を表現する小さな線を追加
    for (let i = 0; i < twitchCount; i++) {
        setTimeout(() => {
            if (!gameRunning) return;
            
            const angle = Math.random() * Math.PI * 2;
            const length = size * 0.3 + Math.random() * size * 0.2;
            const startX = x + Math.cos(angle) * size * 0.3;
            const startY = y + Math.sin(angle) * size * 0.3;
            const endX = startX + Math.cos(angle) * length;
            const endY = startY + Math.sin(angle) * length;
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }, i * 100); // 100msごとに痙攣
    }
}

// 白い液体の生成
function createWhiteFluid(x, y, size) {
    // 複数の白い液体粒子を生成（モバイル端末の場合は数を減らす）
    const particleCount = isMobile ? 10 : 15 + Math.floor(Math.random() * 15);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2.0;
        const particleSize = 2 + Math.random() * 4;
        
        whiteFluids.push({
            x: x + (Math.random() - 0.5) * size * 0.3, // 少しランダムな位置から
            y: y + (Math.random() - 0.5) * size * 0.3,
            size: particleSize,
            directionX: Math.cos(angle) * speed,
            directionY: Math.sin(angle) * speed - 1, // 上向きに少し飛ぶ
            life: 0.8 + Math.random() * 0.2 // 寿命（0〜1）
        });
    }
}

// スプレーのエフェクト表示
function showSprayEffect(x, y) {
    const spraySize = 100; // スプレーサイズを大きくした
    
    // スプレーを描画
    ctx.drawImage(sprayImg, x - spraySize / 2, y - spraySize / 2, spraySize, spraySize);
    
    // スプレーの霧を追加（リアル感を出すため）- モバイル端末の場合は数を減らす
    const mistCount = isMobile ? 15 : 30;
    for (let i = 0; i < mistCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * spraySize * 0.4;
        const particleX = x + Math.cos(angle) * distance;
        const particleY = y + Math.sin(angle) * distance;
        const particleSize = 2 + Math.random() * 3;
        
        ctx.fillStyle = 'rgba(200, 255, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // スプレーの飛沫を追加 - モバイル端末の場合は数を減らす
    const dropletCount = isMobile ? 5 : 10;
    for (let i = 0; i < dropletCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = spraySize * 0.3 + Math.random() * spraySize * 0.3;
        const dropX = x + Math.cos(angle) * distance;
        const dropY = y + Math.sin(angle) * distance;
        const dropSize = 1 + Math.random() * 2;
        
        ctx.fillStyle = 'rgba(150, 255, 150, 0.7)';
        ctx.beginPath();
        ctx.arc(dropX, dropY, dropSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // スプレーを一定時間表示し続ける
    setTimeout(() => {
        if (gameRunning) {
            // 次のフレームで消える
            requestAnimationFrame(gameLoop);
        }
    }, 200); // 表示時間を長くした
}

// ウィンドウのロード時にゲーム初期化
window.addEventListener('load', initGame); 