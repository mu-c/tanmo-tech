class ImageTileMap {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 初始化参数
        this.zoom = 1;  // 初始缩放级别
        this.minZoom = 0.25;
        this.maxZoom = 4;
        this.tileSize = 400;  // 每个瓦片的大小
        
        // 初始偏移量
        this.offsetX = 0;
        this.offsetY = 0;
        
        // 拖动状态
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // 图片瓦片缓存
        this.tileCache = new Map();
        this.maxCacheSize = 200;  // 最大缓存瓦片数
        
        // 地图大小（瓦片数量）
        this.mapWidth = 10;  // 横向10个瓦片
        this.mapHeight = 10; // 纵向10个瓦片
        
        // 初始化
        this.initCanvas();
        this.bindEvents();
        this.centerMap();
        this.startRenderLoop();
    }

    // 初始化Canvas
    initCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.render();
        });
    }

    // 获取瓦片URL（使用本地图片）
    getTileUrl(x, y) {
        // 使用坐标生成1-10的索引
        const p1 = 16777619;
        const p2 = 2166136261;
        const index = (Math.abs((x * p1) ^ (y * p2)) % 10) + 1;
        // 使用本地图片
        return `images/tile${index}.jpg`;
    }

    // 加载并缓存瓦片
    async loadTile(x, y) {
        const key = `${x},${y}`;
        
        // 检查缓存
        if (this.tileCache.has(key)) {
            return this.tileCache.get(key);
        }

        // 如果缓存已满，删除最早的条目
        if (this.tileCache.size >= this.maxCacheSize) {
            const firstKey = this.tileCache.keys().next().value;
            this.tileCache.delete(firstKey);
        }

        try {
            const img = new Image();
            const loaded = new Promise((resolve, reject) => {
                img.onload = () => {
                    console.log('图片加载成功:', this.getTileUrl(x, y));
                    resolve(img);
                };
                img.onerror = (error) => {
                    console.error('图片加载失败:', this.getTileUrl(x, y), error);
                    reject(error);
                };
            });
            img.src = this.getTileUrl(x, y);
            
            await loaded;
            this.tileCache.set(key, img);
            return img;
        } catch (error) {
            console.error('加载瓦片失败:', error);
            return null;
        }
    }

    // 渲染地图
    async render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 计算可见区域的瓦片范围
        const scaledTileSize = this.tileSize * this.zoom;
        const startX = Math.floor(-this.offsetX / scaledTileSize);
        const startY = Math.floor(-this.offsetY / scaledTileSize);
        const endX = Math.ceil((-this.offsetX + this.canvas.width) / scaledTileSize);
        const endY = Math.ceil((-this.offsetY + this.canvas.height) / scaledTileSize);

        // 渲染可见瓦片
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                // 确保在地图范围内
                if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) {
                    continue;
                }

                const tile = await this.loadTile(x, y);
                if (tile) {
                    const drawX = this.offsetX + x * scaledTileSize;
                    const drawY = this.offsetY + y * scaledTileSize;
                    this.ctx.drawImage(tile, drawX, drawY, scaledTileSize, scaledTileSize);
                    
                    // 添加瓦片边框和坐标（调试用）
                    this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                    this.ctx.strokeRect(drawX, drawY, scaledTileSize, scaledTileSize);
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = '14px Arial';
                    this.ctx.fillText(`${x},${y}`, drawX + 10, drawY + 20);
                }
            }
        }

        // 显示当前状态
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(10, 10, 200, 60);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Zoom: ${this.zoom.toFixed(2)}`, 20, 30);
        this.ctx.fillText(`Offset: ${Math.round(this.offsetX)}, ${Math.round(this.offsetY)}`, 20, 50);
    }

    // 居中地图
    centerMap() {
        const totalWidth = this.mapWidth * this.tileSize * this.zoom;
        const totalHeight = this.mapHeight * this.tileSize * this.zoom;
        
        this.offsetX = (this.canvas.width - totalWidth) / 2;
        this.offsetY = (this.canvas.height - totalHeight) / 2;
        
        this.render();
    }

    // 绑定事件处理
    bindEvents() {
        // 鼠标拖动
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            
            this.offsetX += dx;
            this.offsetY += dy;

            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.render();
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // 鼠标滚轮缩放
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // 获取鼠标位置相对于画布的坐标
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // 计算鼠标位置相对于地图内容的坐标
            const contentX = mouseX - this.offsetX;
            const contentY = mouseY - this.offsetY;

            // 计算新的缩放级别
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));
            
            // 调整偏移量以保持鼠标位置不变
            if (newZoom !== this.zoom) {
                const scale = newZoom / this.zoom;
                this.offsetX = mouseX - (contentX * scale);
                this.offsetY = mouseY - (contentY * scale);
                this.zoom = newZoom;
                this.render();
            }
        });
    }

    // 启动渲染循环
    startRenderLoop() {
        // 立即进行第一次渲染
        this.render();
        
        // 设置定时器定期检查和重新渲染
        setInterval(() => {
            this.render();
        }, 1000); // 每秒检查一次
    }
}

// 初始化地图
window.addEventListener('load', () => {
    window.map = new ImageTileMap();
});
