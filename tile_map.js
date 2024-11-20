class TileMap {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 初始化地图参数
        this.zoom = 13;  // 初始缩放级别
        this.minZoom = 1;
        this.maxZoom = 19;
        this.tileSize = 256;  // OpenStreetMap 标准瓦片大小
        
        // 初始中心坐标 (经度,纬度) - 默认设置为旧金山
        this.center = {
            lat: 37.7749,
            lng: -122.4194
        };
        
        // 平移和缩放状态
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // 瓦片缓存
        this.tileCache = new Map();
        this.maxCacheSize = 1000;  // 最大缓存瓦片数
        
        // 初始化
        this.initCanvas();
        this.bindEvents();
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

    // 经纬度转瓦片坐标
    latLngToTile(lat, lng, zoom) {
        const n = Math.pow(2, zoom);
        const x = Math.floor((lng + 180) / 360 * n);
        const latRad = lat * Math.PI / 180;
        const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
        return { x, y };
    }

    // 瓦片坐标转像素坐标
    tileToPixel(tileX, tileY, zoom) {
        const n = Math.pow(2, zoom);
        const x = tileX * this.tileSize;
        const y = tileY * this.tileSize;
        return { x, y };
    }

    // 获取瓦片URL
    getTileUrl(x, y, z) {
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    }

    // 加载并缓存瓦片
    async loadTile(x, y, z) {
        const key = `${z}/${x}/${y}`;
        
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
                img.onload = () => resolve(img);
                img.onerror = reject;
            });
            img.crossOrigin = 'anonymous';  // 允许跨域加载
            img.src = this.getTileUrl(x, y, z);
            
            await loaded;
            this.tileCache.set(key, img);
            return img;
        } catch (error) {
            console.error('Failed to load tile:', error);
            return null;
        }
    }

    // 渲染地图
    async render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 获取当前视口中心的瓦片坐标
        const centerTile = this.latLngToTile(this.center.lat, this.center.lng, this.zoom);
        const centerPixel = this.tileToPixel(centerTile.x, centerTile.y, this.zoom);

        // 计算视口范围内的瓦片
        const tilesX = Math.ceil(this.canvas.width / this.tileSize) + 2;
        const tilesY = Math.ceil(this.canvas.height / this.tileSize) + 2;

        // 计算起始瓦片
        const startX = centerTile.x - Math.floor(tilesX / 2);
        const startY = centerTile.y - Math.floor(tilesY / 2);

        // 渲染可见瓦片
        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                const tileX = startX + x;
                const tileY = startY + y;
                
                // 确保瓦片坐标在有效范围内
                const maxTile = Math.pow(2, this.zoom) - 1;
                if (tileX < 0 || tileY < 0 || tileX > maxTile || tileY > maxTile) {
                    continue;
                }

                const tile = await this.loadTile(tileX, tileY, this.zoom);
                if (tile) {
                    const drawX = x * this.tileSize - (centerPixel.x % this.tileSize);
                    const drawY = y * this.tileSize - (centerPixel.y % this.tileSize);
                    this.ctx.drawImage(tile, drawX, drawY);
                }
            }
        }
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
            
            // 更新中心坐标
            const pixelsPerLngDegree = this.tileSize * Math.pow(2, this.zoom) / 360;
            const pixelsPerLatDegree = this.tileSize * Math.pow(2, this.zoom) / (2 * Math.PI);
            
            this.center.lng -= dx / pixelsPerLngDegree;
            this.center.lat += dy / pixelsPerLatDegree;

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
            
            const zoomDelta = e.deltaY > 0 ? -1 : 1;
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + zoomDelta));
            
            this.render();
        });
    }

    // 开始渲染循环
    startRenderLoop() {
        this.render();
    }
}

// 初始化地图
window.addEventListener('load', () => {
    new TileMap();
});
