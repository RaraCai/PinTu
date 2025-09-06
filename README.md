# PinTu
> 版权所有 © 2025 Yuxuan Cai - 采用 [MIT许可证授权](LICENSE)  
> Copyright © 2025 Yuxuan Cai - Licensed under [MIT.License](LICENSE)  

拼途：为城市通勤者共享出行提供的手机私家车拼车APP.(2025年同济大学软件工程课程设计项目)😀
PinTu: a carpooling app for private vehicles targeting urban commuters for shared transportation.

## 目录(Content)

## 上手指南(Guide)

### 项目概述(Project-introduction)
本项目设计并实现了“拼途”手机私家车拼车APP，为2025年同济大学软件工程课程设计优秀项目。本APP采用React框架与MySQL数据库构建，基于Android Studio平台开发搭建。项目前端提供直观友好的APP界面，后端可通过强大的数据处理能力支持拼车订单的创建、检索、智能匹配、路径规划、订单评分、个人信息与座驾信息修改等功能。系统可区分车主与乘客两种不同角色，确保各类用户能根据自身需求高效操作。
> This project designs and implements the "PinTu" carpooling app for private vehicles, and has been rewarded as one of the excellent projects in Software Engineering Coursework of 2025 Tongji University. The system is built with the React framework and MySQL database and is developed based on the Android Studio platform. The APP offers an intuitive, user-friendly mobile phone interface on the front end, and robust data processing capabilities on the back end for supporting the entire life cycle of carpooling orders, including creating, searching, auto matching, real-time route planning, rating and editing user information,etc. Costomized functional modules for different roles as drivers and passengers, ensuring efficient operation according to user needs.

### 配置要求(Config-requirements)
1. react运行环境及相关依赖
2. yarn和pip运行环境及相关依赖
3. Android Studio开发环境
4. [高德开放平台API](https://lbs.amap.com/)
5. MySQL数据库及密钥
> 1. React runtime environment and related dependencies
> 2. yarn & pip runtime environment and related dependencies
> 3. developing environment of Android Studio
> 4. [Gaode Open Platform API](https://lbs.amap.com/)
> 5. MySQL database and keys

### 运行步骤(Installation-steps)
> [!TIP]
> 在开始运行本项目之前，请您确保已经完成前述配置要求的安装。
> Please make sure you have installed the requirements above to run the project.  
1. 克隆本仓库
2. 使用`yarn install`安装react运行环境所需的依赖
3. 使用`pip install`安装后端环境运行所需的依赖
4. 在高德开放平台注册您的`web服务API`，并在项目文件中替换为您的密钥
5. 在`post-end.py`中将数据库及其密钥配置为您的本地数据库
6. 分别启动前后端，成功运行项目
   ```sh
   yarn android
   python post-end.py
   ```

## 框架总览

## 贡献者
感谢




