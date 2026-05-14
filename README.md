# BIPH 空气质量监测仪表板

一个现代化的空气质量实时监控仪表板，基于 React + Vite 构建，集成 Firebase Realtime Database，支持多设备管理、实时数据卡片和历史趋势图表。

## 功能特性

- **多设备支持** — 自动发现 Firebase 中的所有传感器设备，支持设备切换
- **实时数据卡片** — 大字号展示 CO₂、温度、湿度三大核心指标，颜色编码直观反映空气质量状态
  - CO₂: 绿色 (`<800ppm`) / 黄色 (`800-1500ppm`) / 红色 (`>1500ppm`)
  - 温度: 冷/舒适/热状态指示
  - 湿度: 干燥/舒适/潮湿状态指示
- **历史趋势图表** — 使用 Chart.js 渲染平滑折线图，支持数据点悬停详情
- **时间过滤** — 自由切换「24小时」或「7天」数据视图
- **自动刷新** — 每 10 秒自动拉取最新数据
- **响应式布局** — 适配桌面端与移动端
- **演示模式** — 无需真实传感器，点击「Try Demo」即可查看模拟数据演示
- **空气质量评分** — 首页显示综合 AQI 环形评分卡
- **Sparkline 趋势** — 设备卡片附带 CO₂ 迷你趋势线
- **数据导出** — 支持下载 CSV / JSON 历史数据
- **空气质量警报** — CO₂ / 温度异常时自动提示

## 数据库结构

仪表板从 Firebase Realtime Database 读取数据，期望的数据结构如下：

```json
{
  "Devices": {
    "Sensor_Node_01": {
      "Readings": {
        "-O1aBcDeFgHiJkLm": {
          "co2": 850,
          "temp": 24.5,
          "hum": 60.1,
          "timestamp": 1715000000
        }
      }
    }
  }
}
```

> `timestamp` 为标准 UNIX 时间戳（秒，UTC）。每个 reading 使用 Firebase `push()` 生成的唯一 Key。

## 演示模式（无需真实传感器）

点击导航栏中的 **"Try Demo"** 按钮，即可加载预置的 6 个模拟传感器（图书馆、实验室、食堂、体育馆、行政办公室、音乐室），实时查看模拟数据演示，包括：

- CO₂ 模拟数据，带日间变化趋势（使用时段更高）
- 每 3 秒自动更新最新读数
- 真实的温度、湿度变化曲线
- 所有图表、趋势线、告警功能完全可用

如需永久开启演示模式，可在浏览器控制台执行：
```js
localStorage.setItem('biph-demo', '1'); location.reload();
```
点击页面顶部的 **"Exit Demo"** 横幅可随时退出演示模式。

## 安装与运行

### 前置条件

- Node.js 18+
- npm 9+

### 步骤 1: 安装依赖

```bash
cd "d:/Environmental Engineerig Club/AirMonitoringSystem/BIPH-Air-Monitoring-System"

npm install
```

### 步骤 2: 配置 Firebase（可选）

Firebase 配置已内置在 `src/firebase/config.js` 中。如需更换数据库，请编辑该文件中的 `firebaseConfig` 对象。

### 步骤 3: 启动开发服务器

```bash
npm run dev
```

访问终端输出的本地地址（通常是 `http://localhost:5173`）。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
├── index.html               # HTML 入口
├── package.json             # 依赖与脚本
├── vite.config.js           # Vite 配置
├── tailwind.config.js       # Tailwind CSS 配置
├── postcss.config.js        # PostCSS 配置
├── public/
└── src/
    ├── main.jsx             # React 入口
    ├── App.jsx              # 根组件
    ├── index.css            # 全局样式 + Tailwind
    ├── firebase/
    │   └── config.js        # Firebase 初始化与数据库操作
    ├── components/
    │   ├── Dashboard.jsx    # 主仪表板页面
    │   ├── DeviceSelector.jsx  # 设备选择器
    │   ├── MetricCard.jsx   # 指标卡片 (CO₂/温度/湿度)
    │   ├── HistoricalChart.jsx # 历史折线图
    │   ├── TimeFilter.jsx   # 时间范围过滤器
    │   └── StatusBadge.jsx  # 系统状态徽章
    └── utils/
        └── dateUtils.js     # 日期时间格式化工具
```

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | React 18 + Vite 6 |
| 样式 | Tailwind CSS 3 |
| 图表 | Chart.js 4 + react-chartjs-2 |
| 数据库 | Firebase JS SDK v10 (Realtime Database) |
| 时间处理 | date-fns + chartjs-adapter-date-fns |

## ESP32 数据上传示例

如果你是 ESP32 端开发者，参考以下 Arduino 代码片段向 Firebase 推送数据：

```cpp
#include <FirebaseESP32.h>
#include <WiFi.h>

#define DATABASE_URL "biph-aqs-default-rtdb.asia-southeast1.firebasedatabase.app"
#define DATABASE_SECRET "pYgIQQf7Oxhk0QIphceowkj8h4bxu3u0X6E593xY"

FirebaseData firebaseData;
FirebaseJson json;

void setup() {
  Firebase.begin(DATABASE_URL, DATABASE_SECRET);

  json.set("co2", co2Value);
  json.set("temp", temperature);
  json.set("hum", humidity);
  json.set("timestamp", time(nullptr)); // Unix epoch in seconds

  String path = "/Devices/Sensor_Node_01/Readings";
  Firebase.pushJSON(firebaseData, path.c_str(), json);
}

void loop() {
  // 每隔 60 秒推送一次
  delay(60000);
}
```

## Firebase 安全规则建议

```json
{
  "rules": {
    "Devices": {
      "$deviceId": {
        "Readings": {
          ".read": true,
          ".write": true,
          ".indexOn": ["timestamp"]
        }
      }
    }
  }
}
```

> **注意**: 上述规则允许公开读写，仅适用于开发/测试环境。生产环境请配置适当的认证和授权规则。

## 许可证

MIT License
