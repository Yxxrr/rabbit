// 初始化场景、相机和渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 粒子系统
let particles;
const particleCount = 10000;
let particleSize = 0.1;
let currentColor = 0xff0000;
let isDrawingMode = true;

function initParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    // 初始化所有粒子在随机位置，但隐藏它们
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
        
        sizes[i] = 0; // 初始大小为0，表示不可见
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
        size: particleSize,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

initParticles();

// 相机位置
camera.position.z = 5;

// 交互变量
let isDrawing = false;
let lastMousePosition = { x: 0, y: 0 };
let unusedParticles = Array.from({ length: particleCount }, (_, i) => i);
let usedParticles = [];

// 鼠标/触摸事件处理
function getNormalizedCoordinates(clientX, clientY) {
    return {
        x: (clientX / window.innerWidth) * 2 - 1,
        y: -(clientY / window.innerHeight) * 2 + 1
    };
}

function onPointerDown(event) {
    isDrawing = true;
    const coords = getNormalizedCoordinates(event.clientX, event.clientY);
    lastMousePosition = coords;
    
    if (isDrawingMode) {
        addParticles(coords.x, coords.y);
    }
}

function onPointerMove(event) {
    if (!isDrawing) return;
    
    const coords = getNormalizedCoordinates(event.clientX, event.clientY);
    
    if (isDrawingMode) {
        // 在两点之间插值添加粒子，形成连续线条
        interpolateParticles(lastMousePosition, coords);
    } else {
        // 旋转模式
        rotateScene(lastMousePosition, coords);
    }
    
    lastMousePosition = coords;
}

function onPointerUp() {
    isDrawing = false;
}

// 添加粒子
function addParticles(x, y) {
    if (unusedParticles.length === 0) return;
    
    const count = 5; // 每次添加的粒子数量
    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;
    const sizes = particles.geometry.attributes.size.array;
    
    for (let i = 0; i < count && unusedParticles.length > 0; i++) {
        const index = unusedParticles.pop();
        usedParticles.push(index);
        
        // 将2D屏幕坐标转换为3D空间坐标
        const vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(camera);
        
        positions[index * 3] = vector.x;
        positions[index * 3 + 1] = vector.y;
        positions[index * 3 + 2] = vector.z;
        
        // 设置颜色
        const rgb = hexToRgb(currentColor);
        colors[index * 3] = rgb.r / 255;
        colors[index * 3 + 1] = rgb.g / 255;
        colors[index * 3 + 2] = rgb.b / 255;
        
        sizes[index] = particleSize;
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
    particles.geometry.attributes.size.needsUpdate = true;
}

// 两点之间插值添加粒子
function interpolateParticles(start, end) {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = start.x * (1 - t) + end.x * t;
        const y = start.y * (1 - t) + end.y * t;
        addParticles(x, y);
    }
}

// 旋转场景
function rotateScene(start, end) {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    
    particles.rotation.y += deltaX * 2;
    particles.rotation.x += deltaY * 2;
}

// 清除所有粒子
function clearParticles() {
    const sizes = particles.geometry.attributes.size.array;
    
    for (let i = 0; i < sizes.length; i++) {
        sizes[i] = 0;
    }
    
    unusedParticles = Array.from({ length: particleCount }, (_, i) => i);
    usedParticles = [];
    particles.geometry.attributes.size.needsUpdate = true;
}

// 工具函数：十六进制颜色转RGB
function hexToRgb(hex) {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return { r, g, b };
}

// 事件监听
window.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

window.addEventListener('touchstart', (e) => {
    e.preventDefault();
    onPointerDown(e.touches[0]);
});

window.addEventListener('touchmove', (e) => {
    e.preventDefault();
    onPointerMove(e.touches[0]);
});

window.addEventListener('touchend', (e) => {
    e.preventDefault();
    onPointerUp();
});

// 手势识别
const hammer = new Hammer(document.body);
hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

hammer.on('pan', (e) => {
    if (!isDrawingMode) {
        const coords = getNormalizedCoordinates(e.center.x, e.center.y);
        if (!lastMousePosition.x && !lastMousePosition.y) {
            lastMousePosition = coords;
        }
        rotateScene(lastMousePosition, coords);
        lastMousePosition = coords;
    }
});

// UI控制
document.getElementById('clear-btn').addEventListener('click', clearParticles);
document.getElementById('color-picker').addEventListener('input', (e) => {
    currentColor = parseInt(e.target.value.substring(1), 16);
});

document.getElementById('size-up').addEventListener('click', () => {
    particleSize = Math.min(0.5, particleSize + 0.02);
    particles.material.size = particleSize;
});

document.getElementById('size-down').addEventListener('click', () => {
    particleSize = Math.max(0.05, particleSize - 0.02);
    particles.material.size = particleSize;
});

document.getElementById('mode-toggle').addEventListener('click', () => {
    isDrawingMode = !isDrawingMode;
    document.getElementById('mode-toggle').textContent = 
        isDrawingMode ? '切换模式(旋转)' : '切换模式(绘画)';
});

// 窗口大小调整
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 使粒子有轻微的浮动效果
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < usedParticles.length; i++) {
        const index = usedParticles[i];
        positions[index * 3 + 2] += (Math.random() - 0.5) * 0.01;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    
    renderer.render(scene, camera);
}

animate();