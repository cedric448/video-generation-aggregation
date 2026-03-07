# Nginx 配置说明

## 配置文件

- `video-gen.conf` - Nginx 主配置文件

## 部署步骤

1. 复制配置文件到 Nginx 配置目录:
```bash
sudo cp video-gen.conf /etc/nginx/conf.d/
```

2. 创建认证文件:
```bash
# 安装 htpasswd 工具
sudo yum install -y httpd-tools  # CentOS/RHEL
# 或
sudo apt-get install -y apache2-utils  # Ubuntu/Debian

# 创建用户密码文件
sudo htpasswd -c /etc/nginx/.htpasswd yeyefox000
# 输入密码: asdf12345
```

3. 测试配置:
```bash
sudo nginx -t
```

4. 重新加载配置:
```bash
sudo nginx -s reload
```

## 配置说明

- **监听端口**: 9999
- **认证方式**: HTTP Basic Auth
- **用户名**: yeyefox000
- **密码**: asdf12345
- **上传限制**: 500MB
- **超时时间**: 300秒

## 注意事项

1. 确保防火墙开放 9999 端口
2. 定期更新密码以保证安全
3. 日志文件位于 `/var/log/nginx/video-gen-*.log`
