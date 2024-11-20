class TileMap {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 调整基础瓦片大小为32像素
        this.tileSize = 32;
        this.mapWidth = 3200;
        this.mapHeight = 3000;
        
        // 设置默认缩放为0.5，这样可以看到更多瓦片
        this.scale = 0.5;
        this.minScale = 0.1;
        this.maxScale = 20;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // 分块大小调小一些，提高渲染效率
        this.chunkSize = 100;
        this.chunks = new Map();
        this.imageCache = new Map();
        
        // 调整缩放级别
        this.zoomLevels = [0.25, 0.5, 1, 2, 4];
        this.seed = 12345;

        // 添加渲染标志
        this.isRendering = false;
        this.needsUpdate = true;

        // 初始化
        this.initCanvas();
        this.bindEvents();
        this.centerMap();
        
        // 开始渲染循环
        this.startRenderLoop();
    }

    // 开始渲染循环
    startRenderLoop() {
        const animate = async () => {
            if (this.needsUpdate && !this.isRendering) {
                await this.render();
                this.needsUpdate = false;
            }
            requestAnimationFrame(animate);
        };
        animate();
    }

    // 标记需要更新
    requestUpdate() {
        this.needsUpdate = true;
    }

    // 渲染方法
    async render() {
        if (this.isRendering) return;
        this.isRendering = true;

        try {
            console.log('Starting render...');
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 计算可见区域的块范围
            const visibleStartX = Math.floor(-this.offsetX / (this.tileSize * this.scale));
            const visibleStartY = Math.floor(-this.offsetY / (this.tileSize * this.scale));
            const visibleEndX = Math.ceil((-this.offsetX + this.canvas.width) / (this.tileSize * this.scale));
            const visibleEndY = Math.ceil((-this.offsetY + this.canvas.height) / (this.tileSize * this.scale));

            console.log('Visible range:', {
                startX: visibleStartX,
                startY: visibleStartY,
                endX: visibleEndX,
                endY: visibleEndY
            });

            // 计算块范围
            const chunkStartX = Math.floor(visibleStartX / this.chunkSize);
            const chunkStartY = Math.floor(visibleStartY / this.chunkSize);
            const chunkEndX = Math.ceil(visibleEndX / this.chunkSize);
            const chunkEndY = Math.ceil(visibleEndY / this.chunkSize);

            console.log('Chunk range:', {
                startX: chunkStartX,
                startY: chunkStartY,
                endX: chunkEndX,
                endY: chunkEndY
            });

            // 渲染可见的块
            for (let chunkY = chunkStartY; chunkY < chunkEndY; chunkY++) {
                for (let chunkX = chunkStartX; chunkX < chunkEndX; chunkX++) {
                    try {
                        console.log('Creating chunk:', chunkX, chunkY);
                        const chunk = await this.createChunk(chunkX, chunkY);
                        if (chunk) {
                            const drawX = this.offsetX + chunkX * this.chunkSize * this.tileSize * this.scale;
                            const drawY = this.offsetY + chunkY * this.chunkSize * this.tileSize * this.scale;
                            const drawWidth = this.chunkSize * this.tileSize * this.scale;
                            const drawHeight = this.chunkSize * this.tileSize * this.scale;
                            
                            console.log('Drawing chunk at:', {
                                x: drawX,
                                y: drawY,
                                width: drawWidth,
                                height: drawHeight
                            });
                            
                            this.ctx.drawImage(chunk, drawX, drawY, drawWidth, drawHeight);
                        } else {
                            console.warn('Chunk creation failed:', chunkX, chunkY);
                        }
                    } catch (error) {
                        console.error('Error rendering chunk:', chunkX, chunkY, error);
                        // 如果渲染失败，绘制一个占位符
                        const drawX = this.offsetX + chunkX * this.chunkSize * this.tileSize * this.scale;
                        const drawY = this.offsetY + chunkY * this.chunkSize * this.tileSize * this.scale;
                        const drawWidth = this.chunkSize * this.tileSize * this.scale;
                        const drawHeight = this.chunkSize * this.tileSize * this.scale;
                        
                        this.ctx.fillStyle = '#ffcccc';
                        this.ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
                        this.ctx.strokeStyle = '#ff0000';
                        this.ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
                    }
                }
            }

            // 添加调试信息
            this.ctx.fillStyle = 'black';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`Scale: ${this.scale.toFixed(2)}`, 10, 20);
            this.ctx.fillText(`Center: ${Math.floor(-this.offsetX/this.tileSize/this.scale)},${Math.floor(-this.offsetY/this.tileSize/this.scale)}`, 10, 40);
            
            console.log('Render complete');
        } finally {
            this.isRendering = false;
        }
    }

    // 生成确定性的随机数
    seededRandom(x, y) {
        const dot = x * 12345 + y * 67890;
        const a = Math.sin(dot + this.seed) * 43758.5453123;
        return a - Math.floor(a);
    }

    // 生成特定位置的图案
    generateTilePattern(x, y, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // 使用位置信息生成确定的颜色和图案
        const hue = Math.floor(this.seededRandom(x, y) * 360);
        const pattern = Math.floor(this.seededRandom(x + 1, y + 1) * 5);

        // 背景色
        ctx.fillStyle = `hsl(${hue}, 70%, 80%)`;
        ctx.fillRect(0, 0, size, size);

        // 绘制边框
        ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
        ctx.lineWidth = Math.max(1, size / 32);
        ctx.strokeRect(0, 0, size, size);

        // 根据pattern值绘制不同的图案
        ctx.fillStyle = `hsl(${(hue + 180) % 360}, 70%, 60%)`;
        switch (pattern) {
            case 0: // 圆形
                ctx.beginPath();
                ctx.arc(size/2, size/2, size/3, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 1: // 方格
                ctx.fillRect(size/4, size/4, size/2, size/2);
                break;
            case 2: // 三角形
                ctx.beginPath();
                ctx.moveTo(size/2, size/4);
                ctx.lineTo(size*3/4, size*3/4);
                ctx.lineTo(size/4, size*3/4);
                ctx.closePath();
                ctx.fill();
                break;
            case 3: // 十字
                ctx.fillRect(0, size*2/5, size, size/5);
                ctx.fillRect(size*2/5, 0, size/5, size);
                break;
            case 4: // 菱形
                ctx.beginPath();
                ctx.moveTo(size/2, size/4);
                ctx.lineTo(size*3/4, size/2);
                ctx.lineTo(size/2, size*3/4);
                ctx.lineTo(size/4, size/2);
                ctx.closePath();
                ctx.fill();
                break;
        }

        // 添加坐标文本
        ctx.fillStyle = 'black';
        ctx.font = `${size/4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${x},${y}`, size/2, size/2);

        return canvas;
    }

    // 创建块
    async createChunk(chunkX, chunkY) {
        console.log('Creating chunk with params:', {
            chunkX,
            chunkY,
            scale: this.scale,
            tileSize: this.tileSize,
            chunkSize: this.chunkSize
        });

        const key = `${chunkX},${chunkY}`;
        if (this.chunks.has(key)) {
            console.log('Chunk found in cache:', key);
            return this.chunks.get(key);
        }

        const chunkCanvas = document.createElement('canvas');
        const pixelRatio = Math.max(1, Math.floor(this.scale));
        const actualSize = this.chunkSize * this.tileSize * this.scale;
        chunkCanvas.width = actualSize;
        chunkCanvas.height = actualSize;
        const chunkCtx = chunkCanvas.getContext('2d');

        console.log('Chunk canvas created with size:', {
            width: chunkCanvas.width,
            height: chunkCanvas.height,
            actualSize,
            pixelRatio
        });

        const startX = chunkX * this.chunkSize;
        const startY = chunkY * this.chunkSize;
        const endX = Math.min(startX + this.chunkSize, this.mapWidth);
        const endY = Math.min(startY + this.chunkSize, this.mapHeight);

        console.log('Chunk tile range:', {
            startX,
            startY,
            endX,
            endY
        });

        // 渲染每个瓦片
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tileImage = this.generateTilePattern(x, y, this.tileSize);
                const drawX = (x - startX) * this.tileSize * this.scale;
                const drawY = (y - startY) * this.tileSize * this.scale;
                const drawSize = this.tileSize * this.scale;
                
                console.log('Drawing tile:', {
                    x, y,
                    drawX,
                    drawY,
                    drawSize,
                    tileImageSize: {
                        width: tileImage.width,
                        height: tileImage.height
                    }
                });
                
                chunkCtx.drawImage(tileImage, drawX, drawY, drawSize, drawSize);
            }
        }

        this.chunks.set(key, chunkCanvas);
        return chunkCanvas;
    }

    // 修改事件处理方法
    handleWheel(event) {
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const tileX = (mouseX - this.offsetX) / (this.tileSize * this.scale);
        const tileY = (mouseY - this.offsetY) / (this.tileSize * this.scale);

        const oldScale = this.scale;
        this.scale *= event.deltaY < 0 ? 1.1 : 0.9;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale));

        this.offsetX = mouseX - tileX * this.tileSize * this.scale;
        this.offsetY = mouseY - tileY * this.tileSize * this.scale;

        if (oldScale !== this.scale) {
            this.chunks.clear();
        }

        this.requestUpdate();
    }

    // 修改事件绑定
    bindEvents() {
        window.addEventListener('resize', () => {
            this.initCanvas();
            this.centerMap();
            this.requestUpdate();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastX;
                const deltaY = e.clientY - this.lastY;
                this.offsetX += deltaX;
                this.offsetY += deltaY;
                this.lastX = e.clientX;
                this.lastY = e.clientY;
                this.requestUpdate();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    }

    // 初始化Canvas
    initCanvas() {
        // 设置canvas大小
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // 设置渲染选项
        this.ctx.imageSmoothingEnabled = false;  // 禁用平滑以保持像素清晰
        
        // 添加窗口大小改变事件监听
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.requestUpdate();
        });

        console.log('Canvas initialized:', {
            width: this.canvas.width,
            height: this.canvas.height
        });
    }

    // 居中地图
    centerMap() {
        // 计算地图中心点
        const centerX = this.mapWidth * this.tileSize / 2;
        const centerY = this.mapHeight * this.tileSize / 2;
        
        // 计算偏移量，使地图中心点位于屏幕中心
        this.offsetX = -(centerX * this.scale - this.canvas.width / 2);
        this.offsetY = -(centerY * this.scale - this.canvas.height / 2);
        
        console.log('Map centered:', {
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            scale: this.scale
        });
        
        this.requestUpdate();
    }
}

window.addEventListener('load', () => {
    new TileMap();
});

// 导航栏滚动效果
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});
