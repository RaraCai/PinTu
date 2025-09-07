import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform, // 引入 Platform
  Text,
  ActivityIndicator,
  PermissionsAndroid, // 确认已引入
  Alert,
} from 'react-native';

import Geolocation from 'react-native-geolocation-service';
import TabContent from './component/tabContent';
import MapScreen from './component/map';
import RouteInfoDisplay from './component/RouteInfoDisplay'; 
import DrawerMenu from './component/DrawerMenu';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../config'; // 确认引入后端URL


const {width, height} = Dimensions.get('window');

const Home = ({navigation}) => {
  // --- State Hooks (保持不变) ---
  const [userLocation, setUserLocation] = useState(null);
  const [routePlanningData, setRoutePlanningData] = useState(null);
  const [plannedRouteInfo, setPlannedRouteInfo] = useState({
    startName: '',
    startLocation: '',
    startID: '',
    endName: '',
    endLocation: '',
    endID: '',
  });
  const [selectedDepartureTime, setSelectedDepartureTime] = useState('');
  const [activeTab, setActiveTab] = useState(''); 
  const [car, setCar] = useState(''); 
  const [passengerLimit, setPassengerLimit] = useState('');
  const mapRef = useRef(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // --- 定位逻辑 (保持不变) ---
  const requestLocation = useCallback(async () => {
    let hasPermission = false;
    if (Platform.OS === 'android') {
      try {
        // 添加 try-catch
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          hasPermission = true;
        }
      } catch (err) {
        console.warn('请求定位权限出错:', err);
      }
    } else if (Platform.OS === 'ios') {
      const authStatus = await Geolocation.requestAuthorization('whenInUse');
      if (authStatus === 'granted') {
        hasPermission = true;
      }
    }

    if (hasPermission) {
      Geolocation.getCurrentPosition(
        position => {
          const currentPos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log('定位成功:', currentPos);
          setUserLocation(currentPos);
          if (mapRef.current && !routePlanningData) {
            mapRef.current.moveCamera({target: currentPos, zoom: 14}, 300);
          }
        },
        error => {
          console.log('获取位置失败:', error.code, error.message);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    } else {
      console.log('定位权限未授予');
    }
  }, [routePlanningData]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // --- 事件处理函数 (保持不变) ---
  // 模拟移动
  const simulateMovement = () => {
    // ... (代码保持不变)
    const newLocation = {
      latitude: userLocation.latitude + 0.01,
      longitude: userLocation.longitude + 0.01,
    };
    console.log('模拟移动到:', newLocation);
    setUserLocation(newLocation);
    if (mapRef.current && mapRef.current.moveCamera) {
      mapRef.current.moveCamera({target: newLocation, zoom: 15}, 500);
    }
  };

  // 回到中心
  const handleRecenter = () => {
    // ... (代码保持不变)
    if (userLocation && mapRef.current) {
      console.log('地图回到用户位置:', userLocation);
      mapRef.current.moveCamera({target: userLocation, zoom: 14}, 500);
    } else if (!userLocation) {
      console.log('无法回到中心，正在重新定位...');
      requestLocation();
    }
  };

  // 路径规划成功回调
  const handleRoutePlanned = useCallback(
    (data, startName, startLocation, startID, endName, endLocation, endID, departureTime, car, passengerLimit, activeTab) => {
      setRoutePlanningData(data);
      setPlannedRouteInfo({
        startName, startLocation, startID,
        endName, endLocation, endID
      });
      setSelectedDepartureTime(departureTime);
      setCar(car);
      setPassengerLimit(passengerLimit);
      setActiveTab(activeTab); 
    },
    [],
  );

  // 取消路径规划回调
  const handleCancelRoutePlanning = () => {
    setRoutePlanningData(null);
    setPlannedRouteInfo({startName: '', endName: ''});
    setSelectedDepartureTime('');
    console.log('路径规划已取消');
  };

  // --- 新增: 处理确认逻辑 ---
  const handleConfirmCarpool = async () => {
    // 发车逻辑
    if(activeTab === '发车'){
      console.log('发车API逻辑...');
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('未登录', '请先登录以使用完整功能');
        return;
      }
      try {
        const response = await fetch(`${BASE_URL}/orders/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            car_id: car,
            passenger_limit: passengerLimit,
            planTime: selectedDepartureTime,

            start_address: plannedRouteInfo.startName,
            start_poi_id: plannedRouteInfo.startID,
            start_location: plannedRouteInfo.startLocation,

            end_address: plannedRouteInfo.endName,
            end_poi_id: plannedRouteInfo.endID,
            end_location: plannedRouteInfo.endLocation,

            distance: routePlanningData.paths[0].distance,
            cost: routePlanningData.taxi_cost,
          })
        });
  
        const data = await response.json();
        if(data.status==='success'){
          Alert.alert('发车成功', '您的拼车订单已创建成功！记得及时查看其他人的拼车请求哦~');
          setRoutePlanningData(null);
          setPlannedRouteInfo({startName: '', endName: ''});
          setSelectedDepartureTime('');
          navigation.navigate('Square'); // 跳转到拼车广场
        }
      }
      catch (error) {
        console.error('请求失败:', error);
        Alert.alert('网络错误', '无法获取常用地点，请检查网络连接。');
      }
    }
    
  };

  // 修改菜单按钮点击事件
  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

  // --- End 事件处理函数 ---

  // --- 渲染逻辑 ---
  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}>
        <View style={styles.container}>
          {/* 地图组件 */}
          {userLocation ? ( // 修改了这里的条件渲染逻辑
            <MapScreen
              ref={mapRef}
              location={userLocation}
              setLocation={setUserLocation}
              routeplanningData={routePlanningData}
            />
          ) : (
            // 如果没有用户位置，显示加载指示器
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6c5ce7" />
              <Text style={styles.loadingText}>正在获取位置信息...</Text>
            </View>
          )}

          {/* --- 顶部按钮区域 (仅在主界面显示) --- */}
          {/* 条件：有用户位置 且 没有路线规划数据 */}
          {userLocation && !routePlanningData && (
            <View style={styles.topButtonContainer}>
              {/* ... (左右按钮组保持不变) ... */}
              <TouchableOpacity onPress={toggleDrawer}>
                <Image
                  source={require('../assets/icon-menu.png')}
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
              <View style={styles.rightButtonsWrapper}>
                <TouchableOpacity 
                onPress={() => navigation.navigate('MyGroups')}>
                  <Image
                    source={require('../assets/icon-group.png')}
                    style={styles.buttonIcon}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{marginLeft: 8}}
                  onPress={() => navigation.navigate('Square')}>
                  <Image
                    source={require('../assets/icon-square.png')}
                    style={styles.buttonIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* --- 定位按钮 (仅在主界面显示) --- */}
          {/* 条件：有用户位置 且 没有路线规划数据 */}
          {userLocation && !routePlanningData && (
            <TouchableOpacity
              style={styles.localizationButtonIndependent}
              onPress={handleRecenter}>
              <Image
                source={require('../assets/icon-localization.png')}
                style={styles.localizationIcon}
              />
            </TouchableOpacity>
          )}

          {/* --- 新增: 查看路线页头 (仅在查看路线时显示) --- */}
          {/* 条件：有用户位置 且 有路线规划数据 */}
          {userLocation && routePlanningData && (
            <View style={styles.routeHeaderCurtain}>
              <TouchableOpacity
                style={styles.backButtonContainer}
                onPress={handleCancelRoutePlanning} // 点击返回按钮 = 取消路线
              >
                <Image
                  source={require('../assets/Icon-back.png')} 
                  style={styles.backArrowIcon}
                />
                <Text style={styles.headerTitle}>查看路线</Text>
              </TouchableOpacity>
              {/* 页头右侧可以留空或添加其他按钮 */}
            </View>
          )}

          {/* --- 主要操作区域 (TabContent, 仅在主界面显示) --- */}
          {/* 条件：有用户位置 且 没有路线规划数据 */}
          {userLocation && !routePlanningData && (
            <View style={styles.operatingArea}>
              <TabContent
                userLocation={userLocation}
                onRoutePlanned={handleRoutePlanned}
              />
            </View>
          )}

          {/* --- 路线信息卡片 (RouteInfoDisplay, 仅在查看路线时显示) --- */}
          {/* 条件：有用户位置 且 有路线规划数据 */}
          {userLocation && routePlanningData && (
            <RouteInfoDisplay
              routeData={routePlanningData}
              startName={plannedRouteInfo.startName}
              endName={plannedRouteInfo.endName}
              departureDateTime={selectedDepartureTime}
              activeTab={activeTab} 
              onCancel={handleCancelRoutePlanning} // 传递取消回调
              onConfirm={handleConfirmCarpool} // 传递确认回调
            />
          )}
        </View>
      </ScrollView>

      {/* 添加抽屉菜单 */}
      <DrawerMenu 
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
      />
    </>
  );
  // --- End 渲染逻辑 ---
};

// --- 样式定义 (添加了页头样式，其他保持不变) ---
const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    minHeight: height,
  },
  // 加载状态样式 (新增)
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // 背景色
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  // 主界面顶部按钮容器
  topButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5,
  },
  rightButtonsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  // 主界面定位按钮
  localizationButtonIndependent: {
    position: 'absolute',
    bottom: 425,
    right: width * 0.05, // 右侧边距
    zIndex: 10, // 比顶部按钮更高层级，确保可点击
    borderRadius: 30, // 使其为圆形 (宽度/高度的一半)
    width: 30, // 圆形按钮宽度
    height: 30, // 圆形按钮高度
    justifyContent: 'center', // 图标居中
    alignItems: 'center', // 图标居中
    padding: 5, // 内边距，让图标小一点
    elevation: 6, // Android 阴影
    shadowColor: '#000', // iOS 阴影
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  localizationIcon: {
    width: 50, // 图标大小
    height: 50,
  },
  // 主界面 TabContent 操作区域
  operatingArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    paddingHorizontal: width * 0.05,
    alignItems: 'center',
    zIndex: 1,
  },

  // --- 新增: 查看路线页头样式 ---
  routeHeaderCurtain: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff', // 白色背景
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // 顶部安全区域/状态栏适配
    paddingBottom: 20, // 底部留白
    paddingHorizontal: 15, // 左右内边距
    zIndex: 6, // 层级，确保在地图和 RouteInfoDisplay 之上 (如果需要交互)
    elevation: 4, // Android 轻微阴影
    shadowColor: '#000', // iOS 轻微阴影
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    flexDirection: 'row', // 用于内部元素布局
    alignItems: 'center', // 垂直居中对齐
  },
  backButtonContainer: {
    flexDirection: 'row', // 让图标和文字水平排列
    alignItems: 'center', // 垂直居中对齐
  },
  backArrowIcon: {
    width: 22, // 返回箭头图标大小
    height: 22,
    resizeMode: 'contain',
    tintColor: '#333', // 图标颜色
    marginRight: 8, // 图标和文字间距
  },
  headerTitle: {
    fontSize: 17, // 标题字号
    fontWeight: '600', // 字重
    color: '#333', // 标题颜色
  },
  // RouteInfoDisplay 的样式在其组件内部定义
});
// --- End 样式定义 ---

export default Home; // 导出组件