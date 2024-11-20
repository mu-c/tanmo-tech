#!/bin/bash

# 确保images目录存在
mkdir -p images

# 下载10张不同的图片
for i in {1..10}
do
    echo "下载图片 $i/10..."
    curl -L "https://source.unsplash.com/random/400x400?nature&sig=$i" -o "images/tile$i.jpg"
    sleep 1  # 等待1秒，避免请求过快
done

echo "所有图片下载完成！"
