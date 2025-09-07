from flask import Flask, request, session, flash, jsonify
import hashlib
from sqlalchemy import Column, Integer, String,or_
from werkzeug.utils import secure_filename
from sqlalchemy import create_engine, Column, Enum, Integer, String, ForeignKey, DateTime, Text, Boolean, Float,inspect,MetaData, select, func
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from datetime import datetime
from flask_mail import Mail
from flask_mail import Message as FlaskMessage
import random
from datetime import timedelta
import os
from flask_cors import CORS
from sqlalchemy.exc import SQLAlchemyError
import requests
from http import HTTPStatus
import jwt
import functools

app = Flask(
    __name__,
    static_folder='public', 
    static_url_path='/public'
)
app.secret_key = "" # 请将此替换为您的APP密钥

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

metadata = MetaData()

# 配置 JWT 密钥和过期时间
JWT_SECRET = "" # 请将此替换为您自己的JWT密钥 
JWT_EXPIRATION_DELTA = timedelta(hours=2)  # Token 有效期为 2 小时

# 配置高德api key
gd_key="" # 请将此替换为您自己申请的API密钥

# 配置上传文件夹路径
app.config["UPLOAD_FOLDER"] = os.path.join(os.getcwd(), 'public/uploads')
# 设置允许上传的文件类型
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
# 确保上传目录存在
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


# 配置邮件服务器
app.config["MAIL_SERVER"] = "smtp.qq.com"  # 邮件服务器
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = ""  # 请将此替换为您自己的邮箱
app.config["MAIL_PASSWORD"] = "pfldmgtxqnrpgjie"  # 邮箱授权码
app.config["MAIL_DEFAULT_SENDER"] = ""  # 请将此替换为您自己的邮箱
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(minutes=60)
mail = Mail(app)

# MySQL 数据库连接配置
db_config={
    'user':'root',
    'password':'',# 这里改成自己的数据库密码
    'host':'localhost',
    'port':3306,
    'database': '',# 这里改成自己的数据库名字
    'charset':'utf8mb4'
    }
# 创建数据库连接
engine = create_engine(
    "mysql+pymysql://{user}:{password}@{host}:{port}/{database}?charset={charset}".format(**db_config))

Base = declarative_base()


# 用户表
class User(Base):
    __tablename__ = "users"
    u_id = Column(Integer, primary_key=True, nullable=False, unique=True)  # 用户ID编号
    u_name = Column(String(10), nullable=False, unique=True)  # 用户昵称
    u_password = Column(String(100), nullable=False)  # 用户密码
    u_tel = Column(String(15),unique=True)  # 联系电话
    u_mail = Column(String(50), unique=True)  # 用户邮箱
    u_avatarURL = Column(String(100), nullable=False, default="/public/uploads/avatars/avatar.png")  # 用户头像图片路径
    u_licenseURL = Column(String(100), nullable=False, default="src/assets/logo.png")  # 驾照截图路径
    u_totalOrders = Column(Integer, default=0) # 总订单数
    u_driveCnt = Column(Integer, default=0) # 发起拼车总次数
    u_passengerCnt = Column(Integer, default=0) # 参与拼车总次数
    u_stars = Column(Float,default=5)  # 用户评分，初始默认5分
    u_punctualRate = Column(Float,default=100)  # 用户准时度，初始默认100%准时

# 用户常用地点
class UserFavAddress(Base):
    __abstract__ = True # 抽象基类
    id = Column(Integer, primary_key=True, nullable=False, unique=True) # 自增ID
    name = Column(String(100), nullable=False, unique=True)  # 标签名称
    address = Column(String(200), nullable=False)   # 详细地址
    poi_id = Column(String(50), nullable=True, unique=True) # 高德唯一POI ID
    lng = Column(Float, nullable=False) # 经度
    lat =Column(Float, nullable=False)  # 纬度

# 座驾
class Car(Base):
    __tablename__ = "cars"
    id = Column(Integer, primary_key=True, nullable=False, unique=True) # 自增ID
    owner_id = Column(Integer, ForeignKey("users.u_id"), nullable=False)    # 车主用户ID
    category = Column(Enum("小轿车","吉普车","商务车","面包车","大型车"), nullable=False, default="小轿车") # 车型
    plate = Column(String(20), nullable=False, unique=True, default="牌号暂无")  # 车牌号
    fuelConsumption = Column(Float, nullable=False, default=1)  # 每公里油耗
    brand = Column(String(20), nullable=True)   # 车的品牌

# 拼车订单
class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, nullable=False, unique=True) # 自增ID
    driver_id = Column(Integer, ForeignKey("users.u_id"), nullable=False)    # 车主用户ID
    car_id = Column(Integer, ForeignKey("cars.id"), nullable=False)    # 车ID，外键关联cars表

    passenger_limit = Column(Integer, nullable=False, default=2) # 拼车上限人数，默认为2车主自行调节
    passenger_cnt = Column(Integer) # 目前实际拼单人数
    passenger_getOn = Column(Integer)   # 已上车人数

    planStartTime = Column(DateTime, nullable=False, default=datetime.now)   # 计划发车时间

    startTime = Column(DateTime)    # 实际发车时间
    endTime = Column(DateTime)  # 实际结束时间

    start_poi_id = Column(String(100))  # 起点的高德POI ID
    start_address = Column(String(100)) # 起点详细地址
    start_lng = Column(Float)   # 起点经度
    start_lat = Column(Float)   #起点纬度

    end_poi_id = Column(String(100))  # 终点的高德POI ID
    end_address = Column(String(100)) # 终点详细地址
    end_lng = Column(Float)   # 终点经度
    end_lat = Column(Float)   #终点纬度

    distance = Column(Float)    # 总距离
    cost = Column(Float)    # 订单总价
    status = Column(Enum("waiting","driving","ended"), nullable=False, default="waiting")   # 订单状态，分为waiting-未开始、driving-进行中、ended-已结束

# 乘客信息表
class Passenger(Base):
    __tablename__ = "passengers"
    id = Column(Integer, primary_key=True, nullable=False, unique=True) # 自增ID
    order_id = Column(Integer,ForeignKey("orders.id"), nullable=False)  # 订单ID，外键关联orders表
    passenger_id = Column(Integer, ForeignKey("users.u_id"), nullable=False)    # 乘客用户ID，外键关联users表
    passenger_count = Column(Integer, nullable=False, default=1) # 乘客人数
    getOn_time = Column(DateTime, nullable=True) # 乘客上车时间，用于计算准时率

# 申请表
class Apply(Base):
    __tablename__ = "applies"
    id = Column(Integer, primary_key=True, nullable=False, unique=True) # 自增ID
    order_id = Column(Integer,ForeignKey("orders.id"), nullable=False)  # 订单ID，外键关联orders表
    passenger_id = Column(Integer, ForeignKey("users.u_id"), nullable=False)    # 乘客用户ID，外键关联users表
    driver_id = Column(Integer, ForeignKey("users.u_id"), nullable=False)    # 发车人用户ID，外键关联users表
    passenger_count = Column(Integer, nullable=False, default=1) # 申请拼车人数
    apply_time = Column(DateTime, nullable=False, default=datetime.now) # 申请时间
    approve_time = Column(DateTime, nullable=True)   # 审批时间
    status = Column(Enum("waiting","approved","rejected","ended"),default="waiting")    # 申请状态

# 聊天表
class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True, nullable=False, unique=True) # 自增ID
    order_id = Column(Integer,ForeignKey("orders.id"), nullable=False)  # 订单ID，外键关联orders表
    name = Column(String(100))  # 群聊名称
    member_cnt = Column(Integer)    # 总人数
    online_cnt = Column(Integer)    # 在线人数

# 群聊成员表
class ChatMember(Base):
    __tablename__ = "chatMembers"
    id = Column(Integer, primary_key=True, nullable=False, unique=True) # 自增ID
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)   # 群聊ID，外键关联chats表
    member_id = Column(Integer, ForeignKey("users.u_id"), nullable=False)   # 成员用户ID，外键关联users表
    joined_time = Column(DateTime, nullable=False, default=datetime.now)    # 加入群聊时间
    is_online = Column(Boolean, nullable=False, default=True)   # 成员是否在线
    role = Column(Enum("发起人","参与者"), nullable=False, default="参与者")    # 成员角色，司机-发起人，乘客-参与者

# 群聊消息表
class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, nullable=False, unique=True) # Autoincrement ID
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)   # Chat ID, foreign key to chats table
    sender_id = Column(Integer, ForeignKey("users.u_id"), nullable=False)   # Sender user ID, foreign key to users table
    sender_role = Column(Enum("发起人","参与者"), nullable=False, default="参与者") # Sender role
    content = Column(Text, nullable=False) # Add content column (CRUCIAL for chat history)
    sent_at = Column(DateTime, nullable=False, default=datetime.now)    # Sent time

# 用户评价表
class Rating(Base):
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True, nullable=False, unique=True) # 自增ID
    submitter = Column(Integer, ForeignKey("users.u_id"), nullable=False)   # 提交评价用户ID，外键关联users表
    rater = Column(Integer, ForeignKey("users.u_id"), nullable=False)   # 被评价用户ID，外键关联users表
    order_id = Column(Integer,ForeignKey("orders.id"), nullable=False)  # 订单ID，外键关联orders表
    stars = Column(Integer, nullable=False, default=5)  # 评分，1-5分

db_session_class = sessionmaker(bind=engine)
db_session = db_session_class()

# 将明文密码转换为哈希存储
def hash_password(password):
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

# 随机生成用户名
def generate_username():
    while True:
        username = "PT" + "".join([str(random.randint(0, 9)) for _ in range(8)])
        # 检查是否重复
        existing_user = db_session.query(User).filter(User.u_name == username).first()
        if not existing_user:
            return username

# 用户注册
@app.route("/users/register", methods=["POST"])
def register():
    if request.method == "POST":
        data = request.json  # 获取 JSON 数据

        email = data.get("mail")

        # 检查用户是否重复
        existing_user = db_session.query(User).filter(User.u_mail == email).first()
        if existing_user:
            return jsonify({"status":"failed","message": "该邮箱已被注册"}), HTTPStatus.BAD_REQUEST
        
        # 发送邮件，检查邮箱有效性
        try:
            msg = FlaskMessage(subject="拼途PinTuApp用户注册", recipients = [email])
            msg.body = "您已成功注册拼途PinTuApp，欢迎在这里开启您的私家车拼车之旅！"
            mail.send(msg)
        except Exception as e:
            return jsonify({"status":"failed","message": "邮箱验证出错，请重试"}), HTTPStatus.BAD_REQUEST
        
        # 错误排除后创建新用户
        password = hash_password(data.get("password"))
        username = generate_username()

        new_user = User( u_name=username, u_mail=email, u_password=password )

        create_user_fav_address_table(new_user.u_id)

        db_session.add(new_user)
        db_session.commit()

        return jsonify({"status":"success","message": "注册成功，请登录"}), HTTPStatus.OK
    else:
        return jsonify({"status":"failed","message": "请求错误"}), HTTPStatus.BAD_REQUEST


# 验证 Token 的装饰器
def token_required(f):
    @functools.wraps(f)  # 加上这一行
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"status": "failed", "message": "缺少 Token"}), HTTPStatus.UNAUTHORIZED

        # 检查 Token 是否以 "Bearer " 开头
        if not token.startswith("Bearer "):
            return jsonify({"status": "failed", "message": "Token 格式无效"}), HTTPStatus.UNAUTHORIZED

        try:
            # 移除 "Bearer " 前缀，获取实际的 Token
            token = token.split(" ")[1]
            # 解码 Token
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user = payload  # 将用户信息存入 request 对象
        except jwt.ExpiredSignatureError:
            return jsonify({"status": "failed", "message": "Token 已过期"}), HTTPStatus.UNAUTHORIZED
        except jwt.InvalidTokenError:
            return jsonify({"status": "failed", "message": "无效的 Token"}), HTTPStatus.UNAUTHORIZED

        return f(*args, **kwargs)
    return wrapper


# 用户登录，返回token
@app.route("/users/login", methods=["POST"] )
def login():
    if request.method == "POST":
        data = request.json 
        email = data.get("mail")
        password = hash_password(data.get("password"))
        # 检查用户是否存在
        existing_user = db_session.query(User).filter(User.u_mail == email, User.u_password == password).first()
        if not existing_user:
            return jsonify({"status":"failed","message": "邮箱或密码错误"}), HTTPStatus.BAD_REQUEST
        # 生成token
        token = jwt.encode({
            "u_id": existing_user.u_id, 
            "u_name": existing_user.u_name, 
            "u_mail": existing_user.u_mail
            }, 
            JWT_SECRET, 
            algorithm="HS256")
        return jsonify({"status":"success","message": "登录成功","token": token}), HTTPStatus.OK
    else:
        return jsonify({"status":"failed","message": "请求错误"}), HTTPStatus   
    
# 获取用户昵称
@app.route("/users/name",methods=["GET"])
@token_required
def get_user_name():
    user_id = request.user["u_id"]
    try:
        user = db_session.query(User).filter(User.u_id == user_id).first()
        return jsonify({"status": "success", "user_name": user.u_name}), HTTPStatus.OK
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

    

# 模糊搜索-输入提示
@app.route("/search/AutoComplete", methods=["POST"], endpoint="auto_complete_post")
@token_required
def auto_complete():
    data = request.get_json()
    if not data:
        return jsonify({"status": "failed", "message": "请求体为空或非JSON格式"}), HTTPStatus.BAD_REQUEST

    # 从 JSON 数据中获取所需字段
    latitude = data.get('latitude')
    longitude = data.get('longitude') 
    keyword = data.get('keyword')

    # --- 验证接收到的数据 ---
    if not all([latitude, longitude, keyword]):
        return jsonify({"status": "failed", "message": "缺少 latitude, longitude 或 keyword 字段"}), HTTPStatus.BAD_REQUEST

    try:
        lat_float = float(latitude)
        lon_float = float(longitude)
    except (ValueError, TypeError): # 检查类型错误和值错误
        return jsonify({"status": "failed", "message": "无效的纬度或经度格式"}), HTTPStatus.BAD_REQUEST
    # --- 验证结束 ---

    # 高德地图 API 配置 (保持不变)
    amap_url = "https://restapi.amap.com/v3/assistant/inputtips"
    params = {
        "key": gd_key, 
        "keywords": keyword,
        "location": f"{lon_float},{lat_float}", # 经度,纬度
        "datatype": "all",
    }

    try:
        # 调用高德输入提示 API (保持不变)
        response = requests.get(amap_url, params=params) # 注意：这里仍然是 GET 请求高德 API
        response.raise_for_status()
        data = response.json()

        # 检查高德 API 返回的状态 (保持不变)
        if data.get("status") == "1":
            return jsonify(data.get("tips", [])), HTTPStatus.OK
        else:
            print(f"高德 API 错误: {data.get('info', '未知错误')}")
            return jsonify({"status": "failed", "message": f"高德 API 错误: {data.get('info', '未知错误')}"}), HTTPStatus.BAD_REQUEST
    except requests.RequestException as e:
        print(f"请求异常: {e}")
        return jsonify({"status": "failed", "message": f"连接地图服务时出错: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR


# 生成单一用户的常用地点表
def create_user_fav_address_table(user_id):
    tablename = f'user_{user_id}_fav_addresses'  
    class UserFavAddressTable(UserFavAddress):
        __tablename__ = tablename
        __table_args__ = {'extend_existing': True}  
    
    # 检查表是否存在，如果不存在则创建
    inspector = inspect(engine)
    if not inspector.has_table(tablename):
        UserFavAddressTable.__table__.create(bind=engine)

    return UserFavAddressTable

# 获取常用地点
@app.route("/users/getFavAddress", methods=["GET"],endpoint="get_fav_address")
@token_required
def get_fav_address():
    user_id = request.user["u_id"]
    # 动态获取用户常用地址表
    tablename = f"user_{user_id}_fav_addresses"
    inspector = inspect(engine)
    if not inspector.has_table(tablename):
        return jsonify([]), HTTPStatus.OK   # 没有该用户的表格则直接返回空
    
    # 查询常用地点
    UserFavAddressTable = create_user_fav_address_table(user_id)
    fav_addresses = db_session.query(UserFavAddressTable).all()
    fav_addresses_list = [
        {
            "name": address.name,
            "address": address.address,
            "poi_id": address.poi_id,
            "location": f"{address.lng},{address.lat}",
        }
        for address in fav_addresses
    ]
    
    return jsonify(fav_addresses_list), HTTPStatus.OK


# 增加常用地点
@app.route("/users/addFavAddress", methods=["POST"],endpoint="add_fav_address")
@token_required
def add_fav_address():
    data = request.get_json()
    if not data:
        return jsonify({"status": "failed", "message": "请求体为空或非JSON格式"}), HTTPStatus.BAD_REQUEST
    
    # 从 JSON 数据中获取所需字段
    name = data.get('name')
    address = data.get('address')
    poi_id = data.get('poi_id')
    location = data.get('location') # location形如"121.667003,31.141447"，需分割
    longitude, latitude = location.split(",") if location else (None, None)

    # --- 验证接收到的数据 ---
    if not all([name, address, poi_id, location]):
        return jsonify({"status": "failed", "message": "缺少 name, address, poi_id, location 字段"}), HTTPStatus.BAD_REQUEST
    # --- 验证结束 ---

    user_id = request.user["u_id"]

    # 动态获取用户常用地址表
    UserFavAddressTable = create_user_fav_address_table(user_id)
    # 添加新地址
    new_address = UserFavAddressTable(
        name=name,
        address=address,
        poi_id=poi_id,
        lng=longitude,
        lat=latitude, 
    )
    db_session.add(new_address)
    try:
        db_session.commit()
        return jsonify({"status": "success", "message": "常用地址添加成功"}), HTTPStatus.OK
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 删除常用地点
@app.route("/users/deleteFavAddress", methods=["DELETE"],endpoint="delete_fav_address")
@token_required
def delete_fav_address():
    data = request.get_json()
    if not data:
        return jsonify({"status": "failed", "message": "请求体为空或非JSON格式"}), HTTPStatus.BAD_REQUEST
    
    poi_id = data.get('poi_id')
    user_id = request.user["u_id"]
    # 动态获取用户常用地址表
    UserFavAddressTable = create_user_fav_address_table(user_id)
    # 删除地址
    address_to_delete = db_session.query(UserFavAddressTable).filter_by(poi_id=poi_id).first()
    if address_to_delete:
        db_session.delete(address_to_delete)
        try:
            db_session.commit()
            return jsonify({"status": "success", "message": "常用地址删除成功"}), HTTPStatus.OK
        except SQLAlchemyError as e:
            db_session.rollback()
            return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    else:
        return jsonify({"status": "failed", "message": "未找到该常用地址"}), HTTPStatus.NOT_FOUND





#路径规划
@app.route("/route_planning", methods=["POST"], endpoint="route_planning_post")
@token_required
def route_planning():
    data = request.get_json()
    if not data:
        return jsonify({"status": "failed", "message": "请求体为空或非JSON格式"}), HTTPStatus.BAD_REQUEST

    # 从 JSON 数据中获取所需字段 (修改：获取 origin 和 destination)
    origin = data.get('origin')
    destination = data.get('destination')
    originID = data.get('originID')
    destinationID = data.get('destinationID')

    # --- 验证接收到的数据 --- (修改：验证 origin, destination, originID 和 destinationID)
    if not all([origin, destination, originID, destinationID]):
        return jsonify({"status": "failed", "message": "缺少 origin, destination, originID 或 destinationID 字段"}), HTTPStatus.BAD_REQUEST
    # --- 验证结束 ---

    # 高德地图 API 配置
    amap_url = "https://restapi.amap.com/v5/direction/driving"
    params = {
        "key": gd_key,
        "origin": origin,         
        "destination": destination,
        "origin_id":originID,
        "destination_id":destinationID,
        "show_fields": "polyline,cost"
    }

    try:
        # 调用高德路径规划 API
        response = requests.get(amap_url, params=params)
        response.raise_for_status()
        data = response.json()

        # 检查高德 API 返回的状态
        if data.get("status") == "1":
            return jsonify(data.get("route", [])), HTTPStatus.OK, {'Content-Type': 'application/json'}
        else:
            print(f"高德 API 错误: {data.get('info', '未知错误')}")
            return jsonify({"status": "failed", "message": f"高德 API 错误: {data.get('info', '未知错误')}"}), HTTPStatus.BAD_REQUEST
    except requests.RequestException as e:
        print(f"请求异常: {e}")
        return jsonify({"status": "failed", "message": f"连接地图服务时出错: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 订单创建（发车）
@app.route("/orders/create", methods=["POST"])
@token_required
def create_order():
    data = request.get_json()
    if not data:
        return jsonify({"status": "failed", "message": "请求体为空或非JSON格式"}), HTTPStatus.BAD_REQUEST
    
    # 从 JSON 数据中获取所需字段
    driver_id = request.user["u_id"]
    car_id = data.get('car_id') # 车辆ID，外键关联cars表
    passenger_limit = data.get('passenger_limit')
    planTime = datetime.strptime(data.get('planTime'), "%Y/%m/%d %H:%M") # 验证时间格式
    start_address = data.get('start_address')
    start_poi_id = data.get('start_poi_id')
    start_lng = float(data.get('start_location').split(",")[0])
    start_lat = float(data.get('start_location').split(",")[1])
    end_address = data.get('end_address')
    end_poi_id = data.get('end_poi_id')
    end_lng = float(data.get('end_location').split(",")[0])
    end_lat = float(data.get('end_location').split(",")[1])
    distance = float(data.get('distance'))
    cost = float(data.get('cost'))

    # --- 验证接收到的数据 ---
    if not all([passenger_limit, planTime, start_address, start_poi_id, start_lng, start_lat, end_address, end_poi_id, end_lng, end_lat, distance, cost]):
        return jsonify({"status": "failed", "message": "缺少创建订单所必需的字段"}), HTTPStatus.BAD_REQUEST

    # 创建新订单
    new_order = Order(
        driver_id=driver_id,
        car_id=car_id,
        passenger_limit=passenger_limit,
        passenger_cnt=0, 
        passenger_getOn=0, 
        planStartTime=planTime,
        start_address=start_address,
        start_poi_id=start_poi_id,
        start_lng=start_lng,
        start_lat=start_lat,
        end_address=end_address,
        end_poi_id=end_poi_id,
        end_lng=end_lng,
        end_lat=end_lat,
        distance=distance,
        cost=cost
    )
    db_session.add(new_order)
    db_session.flush() # Flush to get new_order.id before commit

    # 创建一个新群聊用于此订单
    chat_name = f"{start_address} 到 {end_address} 拼车群" 
    new_chat = Chat( #
        order_id = new_order.id,
        name=chat_name, #
        member_cnt=1, # Driver is the first member
        online_cnt=1 # Driver is online initially
    ) #
    db_session.add(new_chat) #
    db_session.flush() # Flush to get new_chat.id

    # 将司机添加为新群聊的成员
    new_chat_member = ChatMember( #
        chat_id=new_chat.id, #
        member_id=driver_id, #
        role='发起人', # Driver is the creator
        is_online=True #
    ) #
    db_session.add(new_chat_member) #

    #  更新用户的发车次数
    user = db_session.query(User).filter(User.u_id == driver_id).first()
    user.u_driveCnt += 1
    user.u_totalOrders += 1
    db_session.add(user)

    try:
        db_session.commit()
        return jsonify({"status":"success","message": "订单和群聊创建成功", "chat_id": new_chat.id}), HTTPStatus.OK 
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e: #
        db_session.rollback() #
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 订单匹配（拼车）
@app.route("/orders/match", methods=["POST"], endpoint="match_order")
@token_required 
def match_order():
    data = request.get_json()
    if not data:
        return jsonify({"status": "failed", "message": "请求体为空或非JSON格式"}), HTTPStatus.BAD_REQUEST
    # 解析拼车者id，拼车者id不能与订单发起人id相同
    passenger_id = request.user["u_id"]
    # 解析JSON请求参数
    start_lng = float(data.get('origin').split(",")[0])
    start_lat = float(data.get('origin').split(",")[1])
    start_poi_id = data.get('originID')
    end_lng = float(data.get('destination').split(",")[0])
    end_lat = float(data.get('destination').split(",")[1])
    end_poi_id = data.get('destinationID')
    passenger_count = data.get('passengerCount')
    price_range = data.get('priceRange')
    carpoolTime = datetime.strptime(data.get('carpoolTime'), "%Y/%m/%d %H:%M")
    
    # 按照条件查询订单
    time_range = timedelta(minutes=30)
    query = db_session.query(Order).filter(
        Order.driver_id != passenger_id,                          # 乘客id不能与发车人id相同
        Order.status == "waiting",                          # status为waiting才可以申请拼车
        Order.planStartTime >= carpoolTime - time_range,    # 发车时间在要求前后30分钟内
        Order.planStartTime <= carpoolTime + time_range,
        Order.cost >= price_range['min']-10,                # 价格范围在要求前后10元内
        Order.cost <= price_range['max']+10,
        passenger_count <= Order.passenger_limit,     # 仍有空位
    )

    all_orders = query.all()
    matched_orders = []

    # 根据起终点经纬度排序
    for order in all_orders:
        # 计算匹配程度
        match_score = 0
        if order.start_poi_id == start_poi_id and order.end_poi_id == end_poi_id:
            match_score = 3
        elif(
            abs(order.start_lng - start_lng)<=0.02 and
            abs(order.start_lat - start_lat)<=0.02 and
            abs(order.end_lng - end_lng)<=0.02 and
            abs(order.end_lat - end_lat)<=0.02
        ):
            match_score = 2
        elif order.start_poi_id == start_poi_id or order.end_poi_id == end_poi_id:
            match_score = 1
        else:
            continue
    
        matched_orders.append((order.id,match_score))

    # 按匹配程度降序排序
    matched_orders.sort(key=lambda x: x[1], reverse=True)

    # 存在匹配订单，则返回
    if matched_orders:
        return jsonify({"status":"best","orders": [order_id for order_id, _ in matched_orders]}), HTTPStatus.OK
    else:
        # 没有匹配订单，按时间排序返回当前所有订单
        query = db_session.query(Order.id).order_by(Order.planStartTime.desc()).all()
        order_ids = [order_id for (order_id,) in query]
        return jsonify({'status': 'all', 'orders': order_ids}), HTTPStatus.OK


# 获取全部订单基本信息（用于广场列表展示）
@app.route("/orders/fetch", methods=["POST"], endpoint="fetch_order")
@token_required
def fetch_order():
    data = request.get_json()
    user_id = request.user["u_id"]
    if not data:
        return jsonify({"status": "failed", "message": "请求体为空或非JSON格式"}), HTTPStatus.BAD_REQUEST
    # 解析JSON数据
    status = data.get('status')
    order_ids = data.get('orders')

    # 返回订单详情数据列表
    results=[]
    # 根据status查询订单
    if status == 'none' or status == 'all':
        current_time = datetime.now()
        query = db_session.query(Order.id).filter(
            Order.planStartTime > current_time, # 已过期的订单不显示
            Order.status == 'waiting'
        ).order_by(Order.planStartTime).all()
        order_ids = [order_id for (order_id,) in query]

    for order_id in order_ids:
        order = db_session.query(Order).filter(Order.id == order_id).first()
        if order:
            # 拆分发车时间
            date_part = order.planStartTime.strftime('%Y/%m/%d')
            time_part = order.planStartTime.strftime('%H:%M')
            # 关联users表，获取驾驶员信息
            driver_id = order.driver_id
            driver = db_session.query(User).filter(User.u_id == driver_id).first()

            result={
                # 订单基本信息
                'order_id': order.id,
                'origination': order.start_address,
                'destination': order.end_address,
                'cost': round(order.cost / order.passenger_limit, 2), # 平均每人费用，保留2位小数
                'date': date_part,
                'time': time_part,
                # 驾驶员个人信息
                'driver_id': driver.u_id,
                'driver_name': driver.u_name,
                'driver_stars': round(driver.u_stars,2),
                'driver_punctualRate': driver.u_punctualRate,
                'driver_total': driver.u_totalOrders,
                'driver_avatarURL': driver.u_avatarURL,
            }
            results.append(result)

    return jsonify({"status": "success", "order_details": results}), HTTPStatus.OK# 添加座驾

# 获取某一订单详情信息（用于SquareDetail界面展示）
@app.route("/orders/<int:order_id>", methods=["GET"], endpoint="fetch_order_detail")
@token_required
def fetch_order_detail(order_id):
    try:
        data = request.get_json
        if not data:
            return jsonify({
                "status": "failed",
                "message": "请求体为空或非JSON格式"
            }), HTTPStatus.BAD_REQUEST
        
        user_id = request.user["u_id"]

        # 依据路径参数order_id返回该订单的详情信息
        existing_order = db_session.query(Order).filter(
            Order.id == order_id
        ).first()
        if existing_order:
            role = 'driver' if existing_order.driver_id == user_id else 'passenger'

            origin_lnglat= str(existing_order.start_lng) + "," + str(existing_order.start_lat)
            destination_lnglat= str(existing_order.end_lng) + "," + str(existing_order.end_lat)

            result={
                # 本订单ID
                'order_id':existing_order.id,
                # 当前用户在本单中的角色
                'role':role,
                'driver_id': existing_order.driver_id,
                # 起点详细信息
                'origin_name': existing_order.start_address,
                'origin_lnglat': origin_lnglat,
                'origin_id': existing_order.start_poi_id,
                # 终点详细信息
                'destination_name': existing_order.end_address,
                'destination_lnglat': destination_lnglat,
                'destination_id': existing_order.end_poi_id,
                # 发车时间
                'departure_time': existing_order.planStartTime.strftime('%Y/%m/%d %H:%M'),
                # 本订单当前状态
                'order_status': existing_order.status,
                # 本订单总价
                'cost': existing_order.cost,
            }

            return jsonify({
                'status':'success',
                'result':result
            }), HTTPStatus.OK

    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed",
            "message": f"数据库错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed",
            "message": f"服务器错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# 乘客申请拼车
@app.route("/orders/apply/<int:order_id>", methods=["POST"], endpoint="apply_order")
@token_required
def apply_order(order_id):
    passenger_id = request.user["u_id"]
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "failed",
            "message": "请求体为空或非JSON格式"
        }), HTTPStatus.BAD_REQUEST
    # 解析JSON数据
    passengerCnt = int(data.get('passengerCnt'))
    # 根据order_id查询订单司机id
    driver_id = db_session.query(Order.driver_id).filter(Order.id == order_id).scalar()
    # 判断申请人和发车人是否相同
    if driver_id == passenger_id:
        return jsonify({"status": "same"}), HTTPStatus.OK
 
    # 检查是否已经申请过本单
    exist_apply = db_session.query(Apply).filter(
        Apply.order_id == order_id,
        Apply.passenger_id == passenger_id,
        Apply.status == 'waiting'
    ).first()
    if exist_apply:
        return jsonify({ "status": "repeated" }), HTTPStatus.OK
    
    # 添加到申请表
    new_apply = Apply(
        order_id=order_id,
        passenger_id=passenger_id,
        driver_id=driver_id,
        passenger_count=passengerCnt,
        apply_time=datetime.now(),
        status="waiting"
    )
    db_session.add(new_apply)
    # 提交申请
    try:
        db_session.commit()
        return jsonify({"status": "success", "message": "拼车申请已发送",}), HTTPStatus.OK
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 获取某乘客的已拼单列表
@app.route("/orders/fetch_applied", methods=["GET"])
@token_required
def fetch_applied():
    try:
        # 从token获取用户ID
        user_id = request.user["u_id"]
        # 查询该用户的所有拼车申请
        applied_orders = db_session.query(Apply).filter(
            Apply.passenger_id == user_id
        ).all()

        # 返回结果列表
        results = []
        for apply in applied_orders:
            try:
                order = db_session.query(Order).filter(Order.id == apply.order_id).first()
                if order:
                    item = {
                        'order_id': order.id,
                        'origination': order.start_address,
                        'destination': order.end_address,
                        'date': order.planStartTime.strftime('%Y/%m/%d'),
                        'time': order.planStartTime.strftime('%H:%M'),
                        'status': apply.status,
                        'passenger_count': apply.passenger_count,
                        'cost':order.cost,
                    }
                    results.append(item)
            except Exception as e:
                continue
        return jsonify({"status": "success", "applied_orders": results}), HTTPStatus.OK
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 获取某司机的已发起列表
@app.route("/orders/fetch_created", methods=["GET"])
@token_required
def fetch_created():
    try:
        # 从token获取用户ID
        user_id = request.user["u_id"]
        # 查询该用户的所有拼车申请
        created_orders = db_session.query(Order).filter(
            Order.driver_id == user_id
        ).all()

        # 返回结果列表
        results = []
        for order in created_orders:
            try:
                item = {
                    'order_id': order.id,
                    'origination': order.start_address,
                    'destination': order.end_address,
                    'date': order.planStartTime.strftime('%Y/%m/%d'),
                    'time': order.planStartTime.strftime('%H:%M'),
                    'status': order.status,
                    'cost': order.cost,
                }
                results.append(item)
            except Exception as e:
                continue
        return jsonify({"status": "success", "created_orders": results}), HTTPStatus.OK
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 获取订单现有成员信息与新申请成员信息
@app.route("/orders/<int:order_id>/members",methods=["GET"],endpoint="fetch_members")
def fetch_members(order_id):
    try:
        driver_info={}
        passengers_info=[]
        new_applies_info=[]
        # 按order_id筛选指定订单
        order = db_session.query(Order).filter( Order.id == order_id ).first()
        # driver信息
        driver = db_session.query(User).filter( User.u_id == order.driver_id).first()
        driver_info = {
            "u_id": driver.u_id,
            "name": driver.u_name,
            "avatar": driver.u_avatarURL
        }
        

        # passengers信息(已通过查找Passenger表)
        passenger_ids = db_session.query(Passenger.passenger_id).filter(
            Passenger.order_id == order_id, 
        ).all()
        passenger_ids = [pid[0] for pid in passenger_ids]
        if passenger_ids:
            passengers = db_session.query(User).filter(User.u_id.in_(passenger_ids)).all()
            passengers_info = []
            for passenger in passengers:
                p = db_session.query(Passenger).filter(
                    Passenger.order_id == order_id,
                    Passenger.passenger_id == passenger.u_id
                ).first()
                passengers_info.append({
                    "u_id": passenger.u_id,
                    "name": passenger.u_name,
                    "avatar": passenger.u_avatarURL,
                    "get_on" : p.getOn_time,
                })
        
        # new_applies(未通过查找Apply表)
        new_applies_ids = db_session.query(Apply.passenger_id).filter(
            Apply.order_id == order_id,
            Apply.status == "waiting"
        ).all()
        new_applies_ids = [pid[0] for pid in new_applies_ids]
        if new_applies_ids:
            new_applies = db_session.query(User).filter(User.u_id.in_(new_applies_ids)).all()
            new_applies_info = []
            for new_apply in new_applies:
                new_applies_info.append({
                    "u_id": new_apply.u_id,
                    "name": new_apply.u_name,
                    "avatar": new_apply.u_avatarURL,
                    "total": new_apply.u_totalOrders,
                    "stars": round(new_apply.u_stars,2)
                })

        return jsonify({
            "status":"success", 
            "driver": driver_info, 
            "passengers": passengers_info,
            "new_applies": new_applies_info
        }), HTTPStatus.OK
    
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 审批-同意拼车
@app.route("/orders/<int:order_id>/applies/<int:user_id>/approve", methods=["POST"], endpoint="approve_apply")
@token_required
def approve_apply(order_id, user_id):
    driver_id = request.user["u_id"]
    # 修改申请表中的记录
    try:
        apply = db_session.query(Apply).filter(
            Apply.order_id == order_id,
            Apply.passenger_id == user_id,
            Apply.driver_id == driver_id
        ).first()

        if not apply:
            return jsonify({"status": "failed", "message": "未找到该申请记录"}), HTTPStatus.NOT_FOUND
        
        # 更新申请状态为approved
        apply.status = "approved"
        # 更新审批时间
        apply.approve_time = datetime.now()
        passenger_cnt = apply.passenger_count

        # Passenger表增加新纪录
        new_passenger = Passenger(
            order_id = order_id,
            passenger_id = user_id,
            passenger_count = passenger_cnt,
        )
        db_session.add(new_passenger)

        # Order表增加已拼单人数
        order = db_session.query(Order).filter(Order.id == order_id).first()
        if order.passenger_cnt:
            order.passenger_cnt += passenger_cnt
        else:
            order.passenger_cnt = passenger_cnt
        db_session.add(order) # Mark order for update

        #把乘客拉进相关群聊
        chat_for_order = db_session.query(Chat).filter(Chat.id == order_id).first() # This assumes Chat.id is linked to Order.id
        if chat_for_order: #
            existing_chat_member = db_session.query(ChatMember).filter_by( #
                chat_id=chat_for_order.id, #
                member_id=user_id #
            ).first() #
            if not existing_chat_member: # Only add if not already a member
                new_chat_member = ChatMember( #
                    chat_id=chat_for_order.id, #
                    member_id=user_id, #
                    role='参与者', # Passenger is a participant
                    joined_time=datetime.now(), #
                    is_online=True # Assume online upon approval
                ) #
                db_session.add(new_chat_member) #
                chat_for_order.member_cnt = chat_for_order.member_cnt + 1 # Increment chat member count
                chat_for_order.online_cnt = chat_for_order.online_cnt + 1 # Increment online count
                db_session.add(chat_for_order) # Mark chat for update


        # 该乘客用户信息修改（订单总数，作为乘客的总数）
        user = db_session.query(User).filter(User.u_id == user_id).first()
        user.u_totalOrders += 1
        user.u_passengerCnt += 1

        db_session.commit()

        return jsonify({"status": "success", "message": "拼车申请已同意"}), HTTPStatus.OK
    
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 审批-拒绝拼车
@app.route("/orders/<int:order_id>/applies/<int:user_id>/reject", methods=["POST"], endpoint="reject_apply")
@token_required
def reject_apply(order_id, user_id):
    driver_id = request.user["u_id"]
    # 修改申请表中的记录
    try:
        apply = db_session.query(Apply).filter(
            Apply.order_id == order_id,
            Apply.passenger_id == user_id,
            Apply.driver_id == driver_id
        ).first()

        if not apply:
            return jsonify({"status": "failed", "message": "未找到该申请记录"}), HTTPStatus.NOT_FOUND

        # 更新申请状态为rejected
        apply.status = "rejected"
        # 更新审批时间
        apply.approve_time = datetime.now()
        db_session.commit()

        return jsonify({"status": "success", "message": "拼车申请已拒绝"}), HTTPStatus.OK
    
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 行驶-确认乘客上车
@app.route("/orders/<int:order_id>/passengers/<int:user_id>/get_on", methods=["POST"], endpoint="get_on")
@token_required
def get_on(order_id, user_id):
    # 修改Passenger表中的记录
    try:
        # 立刻获取当前时间，防止时间延迟导致的错误
        current_time = datetime.now()
        # 确定该乘客
        passenger = db_session.query(Passenger).filter(
            Passenger.order_id == order_id,
            Passenger.passenger_id == user_id
        ).first()
        if not passenger:
            return jsonify({"status": "failed", "message": "未找到该乘客记录"}), HTTPStatus.NOT_FOUND
        # 确定该订单
        order = db_session.query(Order).filter(Order.id == order_id).first()
        if not order:
            return jsonify({"status": "failed", "message": "未找到该订单记录"}), HTTPStatus.NOT_FOUND
        # 修改该订单目前的上车人数
        if order.passenger_getOn:
            order.passenger_getOn += passenger.passenger_count
        else:
            order.passenger_getOn = passenger.passenger_count

        # 确认上车时间，计算乘客准时率
        planned_time = order.planStartTime
        if current_time > planned_time:
            user = db_session.query(User).filter(User.u_id == user_id).first()
            prePunctualRate = user.u_punctualRate
            user.u_punctualRate = user.u_totalOrders * prePunctualRate / (user.u_totalOrders + 1) # 计算新的准时率

        # 更新上车时间
        passenger.getOn_time = current_time

        # 向数据库提交全部更改
        db_session.commit()

        return jsonify({"status": "success", "message": "乘客已确认上车"}), HTTPStatus.OK
    
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 行驶-司机发车
@app.route("/orders/<int:order_id>/drive", methods=["POST"], endpoint="start_order")
@token_required
def start_order(order_id):
    driver_id = request.user["u_id"] 
    try:
        current_time = datetime.now() # 立刻获取当前时间，防止错误
        order = db_session.query(Order).filter(Order.id == order_id).first()
        if not order:
            return jsonify({"status": "failed", "message": "未找到该订单记录"}), HTTPStatus.NOT_FOUND
        if not order.passenger_cnt:
            return jsonify({"status": "success", "all_get_on": False, "message": "暂时无人拼车，您无法直接开启行程~"}), HTTPStatus.OK
        if not order.passenger_getOn or order.passenger_getOn < order.passenger_cnt:
            return jsonify({"status": "success", "all_get_on": False, "message": "本订单的拼车乘客中有尚未上车的乘客哦，若该乘客已上车请您点击其头像修改其上车状态；若该乘客未上车请您耐心等待或与其及时取得联系~"}), HTTPStatus.OK
        
        # 全部乘客均上车：修改订单状态
        order.status = "driving"
        order.startTime = current_time  # 记录发车时间
        # 计算司机准时度
        if current_time > order.planStartTime:
            driver = db_session.query(User).filter(User.u_id == driver_id).first()
            prePunctualRate = driver.u_punctualRate
            driver.u_punctualRate = driver.u_totalOrders * prePunctualRate / (driver.u_totalOrders + 1)
        
        # 向数据库提交全部更改
        db_session.commit()
        return jsonify({"status": "success", "all_get_on": True}), HTTPStatus.OK
    
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 行驶-司机结束行程
@app.route("/orders/<int:order_id>/end", methods=["POST"], endpoint="end_order")
@token_required
def end_order(order_id):
    driver_id = request.user["u_id"]
    try:
        # 确定该订单并修改状态
        order = db_session.query(Order).filter(
            Order.id == order_id,
            Order.driver_id == driver_id
        ).first()
        if not order:
            return jsonify({"status": "failed", "message": "未找到该订单记录"}), HTTPStatus.NOT_FOUND
        order.status = "ended"
        order.endTime = datetime.now()  # 记录结束时间

        # 申请表中所有该订单的乘客改为ended，表示此单已结束
        applies = db_session.query(Apply).filter(
            Apply.order_id == order_id
        ).all()
        for apply in applies:
            apply.status = "ended"
            db_session.add(apply)

         # Set all chat members for this group to offline when the order ends
        chat_for_order = db_session.query(Chat).filter(Chat.id == order_id).first() #
        if chat_for_order: #
            chat_members = db_session.query(ChatMember).filter(ChatMember.chat_id == chat_for_order.id).all() #
            for member in chat_members: #
                member.is_online = False # Set to offline
                db_session.add(member) #
            chat_for_order.online_cnt = 0 # Set online count to 0
            db_session.add(chat_for_order) # Mark chat for update
        
        # 向数据库提交所有更改
        db_session.commit()
        return jsonify({"status": "success", "message": "行程已结束"}), HTTPStatus.OK

    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 评价-获取订单行驶信息
@app.route("/orders/<int:order_id>/review", methods=["GET"], endpoint="get_review_info")
@token_required
def get_review_info(order_id):
    user_id = request.user["u_id"]  
    try:
        # 确定该订单
        order = db_session.query(Order).filter(
            Order.id == order_id
        ).first()
        if not order:
            return jsonify({"status": "failed", "message": "未找到该订单记录"}), HTTPStatus.NOT_FOUND
        
        car = db_session.query(Car).filter(Car.id == order.car_id).first()
        if not car:
            return jsonify({"status": "failed", "message": "未找到与该订单绑定的车辆记录"}), HTTPStatus.NOT_FOUND
        
        # 订单卡片信息
        order_detail={
            "datetime": order.startTime.strftime('%Y/%m/%d %H:%M') if order.startTime else None,    # 发车时间返回实际发车时间
            "start_address": order.start_address,
            "end_address": order.end_address,
            "duration": (order.endTime - order.startTime).total_seconds() // 60 if order.startTime and order.endTime else None,  # 行驶时长，单位分钟
            "cost": order.cost,
            "fuel": round( car.fuelConsumption * order.distance / (1000 * 100), 2),
            "role": "driver" if order.driver_id == user_id else "passenger",  # 当前用户在本单中的角色
        }

        # 订单成员信息
        members_detail=[]
        passengers = db_session.query(Passenger).filter(
            Passenger.order_id == order_id
        ).all()
        for passenger in passengers:   
            user = db_session.query(User).filter(
                User.u_id == passenger.passenger_id,
                User.u_id != user_id, # 不返回自己
            ).first()
            if user:
                member_info = {
                    "u_id": user.u_id,
                    "u_name": user.u_name,
                    "u_avatar": user.u_avatarURL,
                }
                members_detail.append(member_info)
       
        # 获取驾驶员信息
        driver = db_session.query(User).filter(User.u_id == order.driver_id).first()
        driver_detail ={
            "u_id": driver.u_id,
            "u_name": driver.u_name,
            "u_avatar": driver.u_avatarURL,
        }

        # 获取当前用户针对该订单的评分记录
        ratings = db_session.query(Rating).filter(
            Rating.order_id == order_id,
            Rating.submitter == user_id
        ).all()
        # 将评分记录转换为字典格式
        ratings_detail = []
        if ratings:  # 只有在有评分记录时才添加
            ratings_detail = [
                {
                    "rater": rating.rater,  # 被评价者ID
                    "stars": rating.stars    # 评分星级
                }
                for rating in ratings
            ]
        
        # 返回结果
        result = {
            "order_detail": order_detail,
            "members_detail": members_detail,
            "driver_detail": driver_detail,
            "ratings_detail": ratings_detail
        }

        return jsonify({"status": "success", "result": result}), HTTPStatus.OK

    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# 评价-提交评分
@app.route("/orders/<int:order_id>/rate/<int:u_id>", methods=["POST"], endpoint="submit_review")
@token_required
def submit_review(order_id, u_id):
    submitter_id = request.user["u_id"]
    try:
        # 获取请求数据
        data = request.get_json()
        stars = data.get('rating')
        # 评分历史表更新
        new_rating = Rating(
            order_id=order_id,
            rater=u_id,  # 被评价者ID
            stars=stars,  # 评分星级
            submitter=submitter_id,  # 评分提交者ID
        )
        db_session.add(new_rating)

        # 修改该用户的总stars
        user = db_session.query(User).filter(User.u_id == u_id).first()
        user.u_stars = (user.u_totalOrders * user.u_stars + stars) / (user.u_totalOrders +  1)

        # 向数据库提交全部更改
        db_session.commit()
        return jsonify({"status": "success", "message": "您的评分提交成功~"}), HTTPStatus.OK

    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({"status": "failed", "message": f"数据库错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({"status": "failed", "message": f"服务器错误: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR


# 座驾中心-添加座驾
@app.route("/cars/add", methods=["POST"], endpoint="add_car")
@token_required
def add_car():
    try:
        # 获取请求数据
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "failed",
                "message": "请求体为空或非JSON格式"
            }), HTTPStatus.BAD_REQUEST

        # 从token获取用户ID
        owner_id = request.user["u_id"]
        
        # 获取车辆参数
        category = data.get('category', '小轿车')  # 默认为小轿车
        plate = data.get('plate')
        fuel_consumption = data.get('fuelConsumption')
        brand = data.get('brand')

        # 参数验证
        if not plate:
            return jsonify({
                "status": "failed",
                "message": "车牌号不能为空"
            }), HTTPStatus.BAD_REQUEST

        if not fuel_consumption:
            return jsonify({
                "status": "failed",
                "message": "油耗不能为空"
            }), HTTPStatus.BAD_REQUEST

        try:
            fuel_consumption = float(fuel_consumption)
            if fuel_consumption <= 0:
                return jsonify({
                    "status": "failed",
                    "message": "油耗必须大于0"
                }), HTTPStatus.BAD_REQUEST
        except ValueError:
            return jsonify({
                "status": "failed",
                "message": "油耗必须是数字"
            }), HTTPStatus.BAD_REQUEST

        # 检查车牌号是否已存在
        existing_car = db_session.query(Car).filter(
            Car.plate == plate,
            Car.owner_id == owner_id
        ).first()
        
        if existing_car:
            return jsonify({
                "status": "failed",
                "message": "该车牌号已存在"
            }), HTTPStatus.BAD_REQUEST

        # 创建新座驾
        new_car = Car(
            owner_id=owner_id,
            category=category,
            plate=plate,
            fuelConsumption=fuel_consumption,
            brand=brand
        )
        
        db_session.add(new_car)
        db_session.commit()

        return jsonify({
            "status": "success"
        }), HTTPStatus.OK

    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed",
            "message": f"数据库错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed",
            "message": f"服务器错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    
# 获取用户座驾列表
@app.route("/cars/list", methods=["GET"], endpoint="list_cars")
@token_required
def list_cars():
    try:
        # 从token获取用户ID
        user_id = request.user["u_id"]
        
        # 查询该用户的所有座驾
        user_cars = db_session.query(Car).filter(
            Car.owner_id == user_id
        ).all()

        # 格式化返回数据
        cars_list = [
            {
                "id": car.id,
                "brand": car.brand,
                "plate": car.plate,
                "fuelConsumption": car.fuelConsumption,
                "category": car.category  # 额外添加车型信息
            }
            for car in user_cars
        ]

        if not cars_list:
            return jsonify({
                "status": "success",
                "message": "该用户暂无座驾信息",
                "data": []
            }), HTTPStatus.OK

        return jsonify({
            "status": "success",
            "data": cars_list
        }), HTTPStatus.OK

    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed",
            "message": f"数据库错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed",
            "message": f"服务器错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR


# 删除座驾
@app.route("/cars/delete/<int:car_id>", methods=["DELETE"], endpoint="delete_car")
@token_required
def delete_car(car_id):
    try:
        user_id = request.user["u_id"]

        # 验证车辆所有权
        car_to_delete = db_session.query(Car).filter(
            Car.id == car_id,
            Car.owner_id == user_id
        ).first()

        if not car_to_delete:
            return jsonify({
                "status": "failed",
                "message": "未找到该座驾或您无权删除"
            }), HTTPStatus.NOT_FOUND

        db_session.delete(car_to_delete)
        db_session.commit()

        return jsonify({
            "status": "success",
            "message": "座驾删除成功"
        }), HTTPStatus.OK

    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed",
            "message": f"数据库错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed",
            "message": f"服务器错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR


# 个人中心-获取用户信息
@app.route("/users/info", methods=["POST"], endpoint="get_user_info")
@token_required
def get_user_info():
    user_id = request.user["u_id"]
    try:
        data = request.get_json()
        if data.get('u_id'):
            user_id = data['u_id']
        user = db_session.query(User).filter(User.u_id == user_id).first()
        
        if not user:
            return jsonify({
                "status": "failed",
                "message": "用户不存在"
            }), HTTPStatus.NOT_FOUND
        
        user_info = {
            "u_name": user.u_name,
            "u_avatarURL": user.u_avatarURL,
            "u_stars": round(user.u_stars, 2),
            "u_punctualRate": user.u_punctualRate,
            "u_totalOrders": user.u_totalOrders,
            "u_passengerOrders": user.u_passengerCnt,
            "u_driverOrders": user.u_driveCnt,
            "u_tel": user.u_tel,
            "u_license": user.u_licenseURL,
            "u_email": user.u_mail,
        }

        return jsonify({
            "status": "success",
            "user_info": user_info
        }), HTTPStatus.OK

    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed",
            "message": f"数据库错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed",
            "message": f"服务器错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    
# 个人中心-修改用户文本类信息
@app.route("/users/edit", methods=["POST"], endpoint="update_user_info")
@token_required
def update_user_info():
    user_id = request.user["u_id"]
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "failed",
                "message": "请求体为空或非JSON格式"
            }), HTTPStatus.BAD_REQUEST
        
        # 获取用户信息
        user = db_session.query(User).filter(User.u_id == user_id).first()
        if not user:
            return jsonify({
                "status": "failed",
                "message": "用户不存在"
            }), HTTPStatus.NOT_FOUND
        
        # 更新用户信息
        if 'u_name' in data:
            user.u_name = data['u_name']
        if 'u_tel' in data:
            user.u_tel = data['u_tel']
        if 'u_email' in data:
            user.u_mail = data['u_email']
        
        db_session.commit()

        return jsonify({
            "status": "success",
            "message": "用户信息更新成功"
        }), HTTPStatus.OK

    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed",
            "message": f"数据库错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed",
            "message": f"服务器错误: {str(e)}"
        }), HTTPStatus.INTERNAL_SERVER_ERROR

#获得群聊信息
@app.route("/groups/my", methods=["GET"])
@token_required
def get_my_groups():
    try:
        user_id = request.user.get('u_id')
        
        # 获取加入信息
        groups_query = db_session.query(
            Chat.id,
            Chat.name,
            Chat.member_cnt,
            Chat.online_cnt,
            ChatMember.joined_time,
            ChatMember.role
        ).join(
            ChatMember, Chat.id == ChatMember.chat_id
        ).filter(
            ChatMember.member_id == user_id
        ).order_by(
            ChatMember.joined_time.desc()
        )
        
        groups = groups_query.all()
        
        formatted_groups = []
        for group in groups:
            formatted_groups.append({
                "id": group.id,
                "name": group.name,
                "member_cnt": group.member_cnt,
                "online_cnt": group.online_cnt,
                "joined_time": group.joined_time.isoformat() if group.joined_time else None,
                "role": group.role
            })
        
        return jsonify(formatted_groups), HTTPStatus.OK
        
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed", 
            "message": "数据库操作失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed", 
            "message": "获取群组列表失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# 清除历史记录
@app.route("/groups/<int:group_id>/clearHistory", methods=["POST"])
@token_required
def clear_group_history(group_id):
    try:
        user_id = request.user.get('u_id')
        
        # 验证是否是群成员
        member_check = db_session.query(ChatMember).filter(
            ChatMember.chat_id == group_id,
            ChatMember.member_id == user_id
        ).first()
        
        if not member_check:
            return jsonify({
                "status": "failed", 
                "message": "您不是该群聊的成员"
            }), HTTPStatus.FORBIDDEN
        
        if member_check.role != '发起人':
            return jsonify({
                "status": "failed", 
                "message": "只有群聊发起人可以清空聊天记录"
            }), HTTPStatus.FORBIDDEN
        
        # 删除群聊所有消息
        db_session.query(Message).filter(Message.chat_id == group_id).delete()
        db_session.commit()
        
        return jsonify({
            "status": "success", 
            "message": "聊天记录已清空"
        }), HTTPStatus.OK
        
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed", 
            "message": "数据库操作失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed", 
            "message": "清空记录失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR



# 退出群聊
@app.route("/groups/<int:group_id>/leave", methods=["POST"])
@token_required
def leave_group(group_id):
    try:
        user_id = request.user.get('u_id')
        
        # 验证是否是群成员
        member_check = db_session.query(ChatMember).filter(
            ChatMember.chat_id == group_id,
            ChatMember.member_id == user_id
        ).first()
        
        if not member_check:
            return jsonify({
                "status": "failed", 
                "message": "您不是该群聊的成员"
            }), HTTPStatus.BAD_REQUEST
        
        # 获取群聊信息
        chat = db_session.query(Chat).filter(Chat.id == group_id).first()
        if not chat:
            return jsonify({
                "status": "failed", 
                "message": "群聊不存在"
            }), HTTPStatus.BAD_REQUEST
        
        # 移除成员
        db_session.delete(member_check)
        
        # 更新成员数
        chat.member_cnt = max(0, chat.member_cnt - 1)
        
        # 更新在线状态
        if member_check.is_online:
            chat.online_cnt = max(0, chat.online_cnt - 1)
        
        # 如果是群聊创建人或群里最后一人，则删除群聊
        remaining_members = db_session.query(ChatMember).filter(
            ChatMember.chat_id == group_id
        ).count()
        
        if remaining_members == 0 or member_check.role == '发起人':
            db_session.query(Message).filter(Message.chat_id == group_id).delete()
            db_session.query(ChatMember).filter(ChatMember.chat_id == group_id).delete()
            db_session.delete(chat)
        
        db_session.commit()
        
        return jsonify({
            "status": "success", 
            "message": "成功退出群聊"
        }), HTTPStatus.OK
        
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed", 
            "message": "数据库操作失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed", 
            "message": "退出群聊失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    
# 获取群聊信息
@app.route("/groups/<int:group_id>/messages", methods=["GET"])
@token_required
def get_group_messages(group_id):
    try:
        user_id = request.user.get('u_id')
        
        # 验证是否是群成员
        member_check = db_session.query(ChatMember).filter(
            ChatMember.chat_id == group_id,
            ChatMember.member_id == user_id
        ).first()
        
        if not member_check:
            return jsonify({
                "status": "failed", 
                "message": "您不是该群聊的成员"
            }), HTTPStatus.FORBIDDEN
        
        # 获取已发送的消息的信息
        messages_query = db_session.query(
            Message.id,
            Message.content,
            Message.sender_id,
            Message.sender_role,
            Message.sent_at,
            User.u_name.label('sender_name')
        ).join(
            User, Message.sender_id == User.u_id
        ).filter(
            Message.chat_id == group_id
        ).order_by(
            Message.sent_at.asc()
        )
        
        messages = messages_query.all()
        
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "id": msg.id,
                "content": msg.content,
                "sender_id": msg.sender_id,
                "sender_name": msg.sender_name,
                "sender_role": msg.sender_role,
                "sent_at": msg.sent_at.isoformat() if msg.sent_at else None
            })
        
        return jsonify(formatted_messages), HTTPStatus.OK
        
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed", 
            "message": "数据库操作失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed", 
            "message": "获取消息失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# 向群聊发消息
@app.route("/groups/<int:group_id>/messages", methods=["POST"])
@token_required
def send_group_message(group_id):
    try:
        user_id = request.user.get('u_id')
        data = request.json
        
        if not data or not data.get('content'):
            return jsonify({
                "status": "failed", 
                "message": "消息内容不能为空"
            }), HTTPStatus.BAD_REQUEST
        
        content = data.get('content').strip()
        if len(content) > 500:
            return jsonify({
                "status": "failed", 
                "message": "消息内容过长，请控制在500字以内"
            }), HTTPStatus.BAD_REQUEST
        
        # 验证是否是群聊成员
        member_check = db_session.query(ChatMember).filter(
            ChatMember.chat_id == group_id,
            ChatMember.member_id == user_id
        ).first()
        
        if not member_check:
            return jsonify({
                "status": "failed", 
                "message": "您不是该群聊的成员"
            }), HTTPStatus.FORBIDDEN
        
        # 创建新消息
        new_message = Message(
            chat_id=group_id,
            sender_id=user_id,
            sender_role=member_check.role,
            content=content,
            sent_at=datetime.now()
        )
        
        db_session.add(new_message)
        db_session.commit()
        
        return jsonify({
            "status": "success", 
            "message": "消息发送成功",
            "data": {
                "id": new_message.id,
                "content": new_message.content,
                "sender_id": new_message.sender_id,
                "sender_role": new_message.sender_role,
                "sent_at": new_message.sent_at.isoformat()
            }
        }), HTTPStatus.OK
        
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed", 
            "message": "数据库操作失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed", 
            "message": "发送消息失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# 依据订单ID查找对应的群聊
@app.route("/groups/fetchByOrderId/<int:order_id>",methods=["GET"])
def fetch_groups_by_order(order_id):
    try:
        group = db_session.query(Chat).filter(Chat.order_id == order_id).first()
        group_detail = {
            'group_id': group.id,
            'group_name':group.name,
            'group_online_cnt':group.online_cnt
        }
        return jsonify({
            "status": "success",
            "group_detail":group_detail,
        }),HTTPStatus.OK
    except SQLAlchemyError as e:
        db_session.rollback()
        return jsonify({
            "status": "failed", 
            "message": "数据库操作失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        return jsonify({
            "status": "failed", 
            "message": "发送消息失败"
        }), HTTPStatus.INTERNAL_SERVER_ERROR

if __name__ == "__main__":
    Base.metadata.create_all(engine)
    app.run(debug=True)
