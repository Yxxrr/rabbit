const rabbit = document.getElementById('rabbit');
const cursor = document.getElementById('handCursor');
const leftPart = document.getElementById('leftPart');
const rightPart = document.getElementById('rightPart');
const firstScene = document.getElementById('firstScene');
const nextScene = document.getElementById('nextScene');

let progress = 0;
let isRabbitFallen = false;
let canJump = false;
const max = 100;
let canTransition = false;
let isFaceDetected = false;
let autoJumpInterval = null;
let isGuanImage = true; // 跟踪当前是否是关闭图片

// 切换背景图片
function toggleBackgroundImage() {
  const background = nextScene.querySelector('.background');
  if (background) {
    isGuanImage = !isGuanImage;
    background.style.backgroundImage = `url("${isGuanImage ? 'guan.jpg' : 'kai.jpg'}")`;
  }
}

// 自动跳跃函数
function startAutoJump() {
  if (autoJumpInterval) return;
  autoJumpInterval = setInterval(() => {
    if (!isFaceDetected) {
      makeRabbitJump();
      toggleBackgroundImage(); // 每次跳跃时切换图片
    }
  }, 1000); // 每秒跳一次
}

function stopAutoJump() {
  if (autoJumpInterval) {
    clearInterval(autoJumpInterval);
    autoJumpInterval = null;
  }
}

// 场景切换函数
function switchToNextScene() {
  // 直接切换到新场景
  firstScene.style.display = 'none';
  nextScene.classList.add('visible');
  
  // 确保背景图片正确设置
  const background = nextScene.querySelector('.background');
  if (background) {
    background.style.backgroundImage = 'url("guan.jpg")';
    isGuanImage = true; // 重置图片状态
  }

  // 获取新场景中的兔子并添加跳跃动画
  const nextSceneRabbit = nextScene.querySelector('.rabbit');
  setTimeout(() => {
    nextSceneRabbit.classList.add('jumping');
  }, 500);
}

window.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  const newProgress = progress + (e.deltaY > 0 ? 5 : -5);
  progress = Math.min(Math.max(newProgress, 0), max);
  
  const offset = (progress / max) * window.innerWidth;
  leftPart.style.transform = `translateX(${-offset}px)`;
  rightPart.style.transform = `translateX(${offset}px)`;
  
  canTransition = progress >= max;
  
  if (canTransition) {
    rabbit.classList.add('bottom-right');
  } else {
    rabbit.classList.remove('bottom-right');
  }
}, { passive: false });

// 点击事件处理
document.addEventListener('click', (e) => {
  if (e.target === rabbit && canTransition) {
    if (!rabbit.classList.contains('bottom-right')) {
      rabbit.classList.add('bottom-right');
      setTimeout(() => {
        switchToNextScene();
      }, 600);
    } else {
      switchToNextScene();
    }
  }
});

// 处理兔子跳跃
function makeRabbitJump() {
  if (!canJump) return;
  rabbit.classList.add('jump');
  toggleBackgroundImage(); // 每次跳跃时切换图片
  setTimeout(() => {
    rabbit.classList.remove('jump');
  }, 400);
}

// MediaPipe Face Detection setup
const faceDetection = new FaceDetection({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
  }
});

faceDetection.setOptions({
  modelSelection: 0,
  minDetectionConfidence: 0.5
});

faceDetection.onResults((results) => {
  if (results.detections && results.detections.length > 0) {
    // 检测到人脸
    if (!isFaceDetected) {
      console.log('Face detected - stopping auto jump');
      isFaceDetected = true;
      stopAutoJump();
    }
  } else {
    // 没有检测到人脸
    if (isFaceDetected) {
      console.log('Face lost - starting auto jump');
      isFaceDetected = false;
      startAutoJump();
    }
  }
});

// MediaPipe Hands setup
const video = document.createElement('video');
video.style.display = 'none';
document.body.appendChild(video);

const hands = new Hands({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

hands.onResults(results => {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

  const landmarks = results.multiHandLandmarks[0];
  const indexTip = landmarks[8];
  const thumbTip = landmarks[4];

  const x = indexTip.x * window.innerWidth;
  const y = indexTip.y * window.innerHeight;
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;

  const dx = indexTip.x - thumbTip.x;
  const dy = indexTip.y - thumbTip.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const grabThreshold = 0.05;
  const rabbitRect = rabbit.getBoundingClientRect();
  const isOverRabbit = x > rabbitRect.left && x < rabbitRect.right &&
                     y > rabbitRect.top && y < rabbitRect.bottom;

  if (!isRabbitFallen && distance < grabThreshold && isOverRabbit) {
    rabbit.classList.add('bottom');
    isRabbitFallen = true;
    canJump = true;
    // 开始检测人脸并自动跳跃
    startAutoJump();
  } else if (isRabbitFallen && isOverRabbit) {
    makeRabbitJump();
  }
});

// 设置相机
const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
    await faceDetection.send({ image: video });
  },
  width: 640,
  height: 480
});

camera.start(); 