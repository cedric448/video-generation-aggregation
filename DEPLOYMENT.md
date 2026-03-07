# 部署指南

## Nginx 配置说明

### 1. 禁止 80 端口访问

项目配置了严格的端口访问控制:
- ✅ 禁止通过 80 端口访问 `http://cbc.cedricbwang.cloud`
- ✅ 禁止通过 80 端口访问 `http://119.28.50.67`
- ✅ 只能通过 9999 端口访问,并需要用户名密码认证

### 2. 部署步骤

#### 步骤 1: 复制配置文件

```bash
# 复制主配置
sudo cp nginx/video-gen.conf /etc/nginx/conf.d/

# 复制80端口拒绝访问配置
sudo cp nginx/00-default-deny.conf /etc/nginx/conf.d/
```

#### 步骤 2: 注释主配置中的默认 server 块

编辑 `/etc/nginx/nginx.conf`,找到并注释掉默认的 server 块:

```nginx
# 注释掉这个 server 块
# server {
#     listen       80;
#     listen       [::]:80;
#     server_name  _;
#     root         /usr/share/nginx/html;
#     ...
# }
```

#### 步骤 3: 创建认证文件

```bash
# 安装 htpasswd 工具
sudo yum install -y httpd-tools  # CentOS/RHEL
# 或
sudo apt-get install -y apache2-utils  # Ubuntu/Debian

# 创建用户
sudo htpasswd -cb /etc/nginx/.htpasswd yeyefox000 asdf12345
```

#### 步骤 4: 构建前端并部署

```bash
# 构建前端
cd frontend
npm run build

# 复制到 Nginx 目录
sudo mkdir -p /var/www/video-gen
sudo cp -r build/* /var/www/video-gen/
```

#### 步骤 5: 测试并重启 Nginx

```bash
# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 3. 验证部署

```bash
# 测试 80 端口访问 - 应该返回 403
curl http://cbc.cedricbwang.cloud/
# 输出: Access denied. Please visit http://cbc.cedricbwang.cloud:9999 with authentication.

curl http://119.28.50.67/
# 输出: Access denied. Please visit http://cbc.cedricbwang.cloud:9999 with authentication.

# 测试 9999 端口无认证 - 应该返回 401
curl http://cbc.cedricbwang.cloud:9999/
# 输出: 401 Unauthorized

# 测试 9999 端口带认证 - 应该返回 200
curl -u yeyefox000:asdf12345 http://cbc.cedricbwang.cloud:9999/
# 输出: <!doctype html>...
```

### 4. 访问应用

浏览器访问: `http://cbc.cedricbwang.cloud:9999`

- 用户名: `yeyefox000`
- 密码: `asdf12345`

## 安全建议

1. **定期更换密码**: 使用 `htpasswd` 更新密码
2. **配置 SSL**: 生产环境建议配置 HTTPS
3. **防火墙规则**: 确保只开放必要端口
4. **日志监控**: 定期查看访问日志,发现异常访问

## 故障排查

### 问题 1: 80 端口还能访问

检查是否有其他配置文件监听 80 端口:
```bash
grep -r "listen 80" /etc/nginx/conf.d/
```

### 问题 2: 9999 端口无法访问

检查端口是否被占用:
```bash
lsof -i :9999
```

检查 Nginx 是否正常运行:
```bash
systemctl status nginx
```

### 问题 3: 403 或 500 错误

查看 Nginx 错误日志:
```bash
tail -f /var/log/nginx/video-gen-error.log
```

检查文件权限:
```bash
ls -la /var/www/video-gen/
```
