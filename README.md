# PinTu
[![License](https://img.shields.io/badge/github-snowdreams1006-brightgreen.svg)](https://github.com/snowdreams1006)

> 版权所有 © 2025 Yuxuan Cai - 采用 [MIT许可证授权](LICENSE)  
> Copyright © 2025 Yuxuan Cai - Licensed under [MIT.License](LICENSE)  

拼途：为城市通勤者共享出行提供的手机私家车拼车APP.(2025年同济大学软件工程课程设计项目)🚙  
PinTu: a carpooling app for private vehicles targeting urban commuters for shared transportation.🚗

## 目录(Content)
- [上手指南(Guide)](#上手指南guide)
   - [项目概述(Project Introduction)](#项目概述project-introduction)
   - [配置要求(Config Requirements)](#配置要求config-requirements)
   - [安装步骤(Installation Steps)](#安装步骤installation-steps)
- [使用到的框架(Frameworks Used)](#使用到的框架frameworks-used)
- [贡献者(Contributors)](#贡献者contributors)
- [免责声明(Disclaimers)](#免责声明disclaimers)

### 上手指南(Guide)

#### 项目概述(Project Introduction)
本项目设计并实现了“拼途”手机私家车拼车APP，为2025年同济大学软件工程课程设计优秀项目。本APP采用**React**框架与**MySQL**数据库构建，基于**Android Studio**平台开发搭建。项目前端提供直观友好的APP界面，后端可通过强大的数据处理能力支持拼车订单的创建、检索、智能匹配、路径规划、订单评分、个人信息与座驾信息修改等功能。系统可区分车主与乘客两种不同角色，确保各类用户能根据自身需求高效操作。
> This project designs and implements the "PinTu" carpooling app for private vehicles, and has been rewarded as one of the excellent projects in Software Engineering Coursework of 2025 Tongji University. The system is built with the **React framework** and **MySQL database** and is developed based on the **Android Studio** platform. The APP offers an intuitive, user-friendly mobile phone interface on the front end, and robust data processing capabilities on the back end for supporting the entire life cycle of carpooling orders, including creating, searching, auto matching, real-time route planning, rating and editing user information,etc. Costomized functional modules for different roles as drivers and passengers, ensuring efficient operation according to user needs.

#### 配置要求(Config Requirements)
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

#### 安装步骤(Installation Steps)
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

> 1. Clone this repo
>    ```sh
>    git clone https://github.com/RaraCai/PinTu.git
>    ```
> 2. Install requirements for runnig React framework
>    ```sh
>    yarn install
>    ```
> 3. Install requirements for running post-end APIs
>    ```sh
>    pip install
>    ```
> 4. Get a free API Key for web service at [https://lbs.amap.com/](https://lbs.amap.com/) and replace the code
> 5. Use your own MySQL configuration to replace **post-end.py**
> 6. Run the project
>     ```sh
>     yarn android
>     python post-end.py
>     ```

### 使用到的框架(Frameworks Used)
- [React Native](https://www.react-native.cn/)
- [Flask](https://dormousehole.readthedocs.io/en/latest/index.html)
- [Android Studio](https://developer.android.google.cn/)

### 贡献者(Contributors)
感谢[@RaraCai](https://github.com/RaraCai)、[@salmooonaa](https://github.com/salmooonaa)、[@LynbelleShao](https://github.com/LynbelleShao)、[@HealthScript](https://github.com/HealthScript)以及[@stonelu2003](https://github.com/stonelu2003)对本仓库的贡献。  
> Thanks to [@RaraCai](https://github.com/RaraCai), [@salmooonaa](https://github.com/salmooonaa), [@LynbelleShao](https://github.com/LynbelleShao), [@HealthScript](https://github.com/HealthScript) and [@stonelu2003](https://github.com/stonelu2003) for their contribution to this project.

## 免责声明(Disclaimers)
本仓库包含的代码和资料仅用于个人学习和研究目的，不得用于任何商业用途。请其他用户在下载或参考本仓库内容时，严格遵守学术诚信原则，不得将这些资料用于任何形式的作业提交或其他可能违反学术诚信的行为。本人对因不恰当使用仓库内容导致的任何直接或间接后果不承担责任。请在使用前务必确保您的行为符合所在学校或机构的规定，以及适用的法律法规。如有任何问题，请通过[电子邮件](mailto:cyx_yuxuan@outlook.com)与我联系。
> The code and materials contained in this repository are intended for personal learning and research purposes only and may not be used for any commercial purposes. Other users who download or refer to the content of this repository must strictly adhere to the principles of academic integrity and must not use these materials for any form of homework submission or other actions that may violate academic honesty. I am not responsible for any direct or indirect consequences arising from the improper use of the contents of this repository. Please ensure that your actions comply with the regulations of your school or institution, as well as applicable laws and regulations, before using this content. If you have any questions, please contact me via [email](mailto:cyx_yuxuan@outlook.com).
