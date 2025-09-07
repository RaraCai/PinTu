import React, {useState, useEffect, useCallback} from 'react';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';

import BASE_URL from '../../../config'; // 确认路径正确

const {width, height} = Dimensions.get('window'); // 获取屏幕尺寸

// --- 可复用输入组件 ---

// 起点和终点位置输入组件
const LocationInput = ({startLocation, endLocation, onNavigate}) => (
  <View style={styles.locationRowContainer}>
    <Image
      source={require('../../assets/start-dots-end.png')}
      style={styles.starts_endImage}
    />
    <View style={styles.locationInputsWrapper}>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => onNavigate('start')}
      >
        <Text
          style={[
            styles.locationText,
            {color: startLocation === '选择起点' ? '#BDBCBC' : '#50565A'},
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {startLocation}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => onNavigate('end')}
      >
        <Text
          style={[
            styles.locationText,
            {color: endLocation === '选择终点' ? '#BDBCBC' : '#50565A'},
          ]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {endLocation}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

const DateTimeInput = ({selectedDateTime, onShowPicker}) => (
  <View style={styles.dateTimeInputContainer}>
    <Image source={require('../../assets/icon-time.png')} style={styles.icon} />
    <TouchableOpacity onPress={onShowPicker} style={styles.touchableInput}>
      <Text
        style={[
          styles.input,
          styles.dateTimeText,
          {color: selectedDateTime ? '#50565A' : '#BDBCBC'},
        ]}
        numberOfLines={1}
        ellipsizeMode="tail">
        {selectedDateTime || '上车时间'}
      </Text>
    </TouchableOpacity>
  </View>
);

const PassengerInput = ({placeholder, value, onChangeText}) => (
  <View style={styles.passengerInputContainer}>
    <Image
      source={require('../../assets/icon-people.png')}
      style={styles.icon}
    />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#BDBCBC"
      keyboardType="numeric"
      value={value ? String(value) : ''}
      onChangeText={onChangeText}
      maxLength={2}
    />
  </View>
);

const CarModelInput = ({car, onNavigate}) => (
  <View style={styles.locationRowContainer}>
    <Image
      source={require('../../assets/icon-mycar.png')}
      style={styles.icon}
    />
    <View style={styles.locationInputsWrapper}>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => onNavigate()}
      >
        <Text
          style={[
            styles.locationText,  // 样式和起终点选择保持一致
            {color: car === '选择您的座驾' ? '#BDBCBC' : '#50565A'},
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >  
          {car}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

const TabContent = ({userLocation, onRoutePlanned}) => {
  const [activeTab, setActiveTab] = useState('拼车');
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [isDateTimePickerVisible, setDateTimePickerVisibility] = useState(false);
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [passengerCount, setPassengerCount] = useState('');
  const [priceRange, setPriceRange] = useState({min: 10, max: 250});
  const [maxPassengers, setMaxPassengers] = useState('');
  const [carModel, setCarModel] = useState(null);
  
  const navigation = useNavigation();


  const showDateTimePicker = useCallback(() => {
    setDateTimePickerVisibility(true);
  }, []);

  const hideDateTimePicker = useCallback(() => {
    setDateTimePickerVisibility(false);
  }, []);

  const handleConfirm = useCallback(
    datetime => {
      const year = datetime.getFullYear();
      const month = (datetime.getMonth() + 1).toString().padStart(2, '0');
      const day = datetime.getDate().toString().padStart(2, '0');
      const hours = datetime.getHours().toString().padStart(2, '0');
      const minutes = datetime.getMinutes().toString().padStart(2, '0');
      const formattedDateTime = `${year}/${month}/${day} ${hours}:${minutes}`;
      setSelectedDateTime(formattedDateTime);
      hideDateTimePicker();
    },
    [hideDateTimePicker, setSelectedDateTime, selectedDateTime],
  );

  useEffect(() => {
    if (activeTab === '拼车') {
      setMaxPassengers('');
      setCarModel(null);
    } else {
      setPassengerCount('');
      setPriceRange({min: 10, max: 250});
    }
  }, [activeTab]);

  const handleNavigateToSearch = useCallback(
    type => {
      navigation.navigate('Search', {
        type,
        userLocation: userLocation,
        onSelectLocation: ({type: selectedType, location}) => {
          const locationData = {
            name: location.name || '未知地点',
            id: location.id || location.poi_id,
            location: location.location,
            address: location.address || location.district || '',
          };

          if (selectedType === 'start') {
            setStartLocation(locationData);
          } else {
            setEndLocation(locationData);
          }
        },
      });
    },
    [navigation, userLocation],
  );

  const HandleNavigateToMyVehicle = useCallback(
    () => {
      navigation.navigate('MyVehicle', {
        onSelectCar: (selectedCar) => {
          console.log('返回到home选中的车辆：',selectedCar);
          setCarModel(selectedCar);
        },  
      });
    },
    [navigation]
  );

  const renderTabButton = (tabName, activeIcon, inactiveIcon, text) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tabName && styles.activeTab]}
      onPress={() => setActiveTab(tabName)}
      key={tabName}
    >
      <Image
        source={activeTab === tabName ? activeIcon : inactiveIcon}
        style={[styles.icon, activeTab === tabName && styles.activeIcon]}
      />
      <Text
        style={[styles.tabText, activeTab === tabName && styles.activeTabText]}>
        {text}
      </Text>
    </TouchableOpacity>
  );

  // 处理提交发车按钮点击事件
  const handleDepartSubmit = async () => {
    // --- 1. 基础信息验证 ---
    if (!startLocation || !endLocation || !selectedDateTime) {
      Alert.alert('信息不完整', '请选择起点、终点和出发时间');
      return;
    }
    // 再次验证坐标格式
    if (
      !startLocation.location ||
      startLocation.location.split(',').length !== 2 ||
      !endLocation.location ||
      endLocation.location.split(',').length !== 2 ||
      isNaN(parseFloat(startLocation.location.split(',')[0])) ||
      isNaN(parseFloat(startLocation.location.split(',')[1])) ||
      isNaN(parseFloat(endLocation.location.split(',')[0])) ||
      isNaN(parseFloat(endLocation.location.split(',')[1]))
    ) {
      Alert.alert('坐标错误', '起点或终点坐标无效，请重新选择地点');
      return;
    }

    // --- 2. Tab 特定信息验证 ---
    if (!maxPassengers || !carModel) {
      // 验证车型不为空
      Alert.alert('信息不完整', '请填写乘客数上限和您的座驾信息');
      return;
    }
    const mPassengers = parseInt(maxPassengers, 10);
    if (isNaN(mPassengers) || mPassengers <= 0 || mPassengers > 10) {
      // 简单验证人数范围
      Alert.alert('输入错误', '乘客数上限必须是 1 到 10 之间的有效数字');
      return;
    }
    console.log('准备提交发车请求...');

    // --- 3. Token 获取和验证 ---
    let token;
    try {
      token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('未登录', '请先登录后再进行操作');
        navigation.navigate('Login');
        return;
      }
    } catch (error) {
      console.error('获取 token 失败:', error);
      Alert.alert('操作失败', '无法获取登录状态，请稍后重试');
      return;
    }

    try {
      const requestBody = {
        origin: startLocation.location,
        destination: endLocation.location,
        originID: startLocation.id,
        destinationID: endLocation.id,
      };

      const response = await fetch(`${BASE_URL}/route_planning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('路径规划后端返回：', response);

      if (response.ok) {
        let routePlanningData;
        try {
          routePlanningData = await response.json();
        } catch (parseError) {
          console.error('解析路径规划响应 JSON 失败:', parseError, '响应体:', responseBody);
          Alert.alert('请求失败', '服务器返回数据格式错误，请稍后重试。');
          return;
        }

        if (onRoutePlanned) {
          onRoutePlanned(
            routePlanningData,
            startLocation.name,
            startLocation.location,
            startLocation.id,
            endLocation.name,
            endLocation.location,
            endLocation.id,
            selectedDateTime,
            carModel.id,
            maxPassengers,
            activeTab,
          );
          console.log(selectedDateTime);
        }
      } else {
        console.error('路径规划 API 请求失败:', response.status, responseBody);
        if (response.status === 401) {
          Alert.alert('认证失败', '登录已过期或无效，请重新登录。');
          await AsyncStorage.removeItem('token');
          navigation.navigate('Login');
        } else if (response.status === 400) {
          Alert.alert('请求错误', `路径规划失败，请检查起点和终点是否有效。(${responseBody})`);
        } else if (response.status === 404) {
          Alert.alert('规划失败', '无法找到从起点到终点的有效路径。');
        } else {
          Alert.alert('规划失败', `服务器错误 (${response.status})，请稍后重试。`);
        }
      }
    } catch (error) {
      console.error('路径规划网络请求出错:', error);
    }
  };

  // 处理提交拼车按钮点击事件
  const handleCarpoolSubmit = async () => {
    // 拼车乘客无需查看路线，直接根据乘客输入的拼车信息跳转到广场进行订单匹配
    // --- 1. 基础信息验证 ---
    if (!startLocation || !endLocation || !selectedDateTime) {
      Alert.alert('信息不完整', '请选择起点、终点和出发时间');
      return;
    }
    // 再次验证坐标格式
    if (
      !startLocation.location ||
      startLocation.location.split(',').length !== 2 ||
      !endLocation.location ||
      endLocation.location.split(',').length !== 2 ||
      isNaN(parseFloat(startLocation.location.split(',')[0])) ||
      isNaN(parseFloat(startLocation.location.split(',')[1])) ||
      isNaN(parseFloat(endLocation.location.split(',')[0])) ||
      isNaN(parseFloat(endLocation.location.split(',')[1]))
    ) {
      Alert.alert('坐标错误', '起点或终点坐标无效，请重新选择地点');
      return;
    }

    // --- 2. Tab 特定信息验证 ---
    if (!passengerCount || !priceRange) {
      Alert.alert('信息不完整', '请填写上车人数和价格区间');
      return;
    }
    const pCount = parseInt(passengerCount, 10);
    if (isNaN(pCount) || pCount <= 0 || pCount > 10) {
      // 简单验证人数范围
      Alert.alert('输入错误', '上车人数必须是 1 到 10 之间的有效数字');
      return;
    }
    console.log('准备提交拼车请求...');

    // --- 3. Token 获取和验证 ---
    let token;
    try {
      token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('未登录', '请先登录后再进行操作');
        navigation.navigate('Login'); // 跳转到登录页
        return;
      }
    } catch (error) {
      console.error('获取 token 失败:', error);
      Alert.alert('操作失败', '无法获取登录状态，请稍后重试');
      return;
    }

    // --- 4. 执行订单匹配 API 调用 ---
    try{
      console.log('发起订单匹配请求...');
      const requestBody = {
        origin: startLocation.location, // "lon,lat"
        destination: endLocation.location, // "lon,lat"
        originID: startLocation.id, // POI ID 或 null
        destinationID: endLocation.id, // POI ID 或 null
        passengerCount: pCount,
        priceRange: priceRange,
        carpoolTime: selectedDateTime,
      };
      console.log('订单匹配请求体:', requestBody);

      const response = await fetch(`${BASE_URL}/orders/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, 
        },
        body: JSON.stringify(requestBody),
      });

      const responseBody = await response.text(); 
      if(response.ok){
        let ordersData;
        ordersData = JSON.parse(responseBody);
        // 跳转广场，依照status码展示不同的订单信息
        navigation.navigate('Square', {
          'status': ordersData.status, // status码，决定广场显示的是最佳匹配还是全部订单
          'orders': ordersData.orders, // 按匹配度降序排列的订单列表
          'passengerCount': passengerCount,
        });
      }

    }catch(error){
    
    }

  };
  
  return (
    <View style={styles.tabContentContainer}>
      <View style={styles.tabContainer}>
        {renderTabButton(
          '拼车',
          require('../../assets/icon-search-active.png'),
          require('../../assets/icon-search.png'),
          '我要拼车',
        )}
        {renderTabButton(
          '发车',
          require('../../assets/icon-car-active.png'),
          require('../../assets/icon-car.png'),
          '我要发车',
        )}
      </View>

      <View style={styles.contentContainer}>
        <LocationInput
          startLocation={startLocation?.name || '选择起点'}
          endLocation={endLocation?.name || '选择终点'}
          onNavigate={handleNavigateToSearch}
        />

        {activeTab === '拼车' ? (
          <>
            <View style={styles.rowContainer}>
              <DateTimeInput
                selectedDateTime={selectedDateTime}
                onShowPicker={showDateTimePicker}
              />
              <PassengerInput
                placeholder="上车人数"
                value={passengerCount}
                onChangeText={setPassengerCount}
              />
            </View>

            <View style={styles.rowContainer}>
              <Image
                source={require('../../assets/icon-money.png')}
                style={styles.icon}
              />
                <View style ={styles.sliderContainer}>
                    <Text style={styles.sliderValue}>
                      {priceRange.min} - {priceRange.max} 元
                    </Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={15}
                      maximumValue={500}
                      step={5}
                      value={priceRange.max}
                      onValueChange={value => setPriceRange(prev => ({ ...prev, max: value }))}
                      minimumTrackTintColor="#9990F5"
                      maximumTrackTintColor="#E0E0E0"
                      thumbTintColor="#6c5ce7"
                    />
                  </View>
            </View>

            {/* "参与拼车" 提交按钮 */}
            <TouchableOpacity onPress={handleCarpoolSubmit}>
              <LinearGradient
                colors={['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']}
                start={{x: 0.9928, y: 0.5072}}
                end={{x: 0.0072, y: 0.5072}}
                style={styles.submitButton}>
                <Text style={styles.submitButtonText}>参与拼车</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.rowContainer}>
              <DateTimeInput
                selectedDateTime={selectedDateTime}
                onShowPicker={showDateTimePicker}
              />
              <PassengerInput
                placeholder="乘客数上限"
                value={maxPassengers}
                onChangeText={setMaxPassengers}
              />
            </View>

            <CarModelInput
              car={carModel? `${carModel.brand} | ${carModel.plate} | ${carModel.category}` : '选择您的座驾'}
              onNavigate={HandleNavigateToMyVehicle}
            />

            {/* "发起拼车" 提交按钮 */}
            <TouchableOpacity onPress={handleDepartSubmit}>
              <LinearGradient
                colors={['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']}
                start={{x: 0.9928, y: 0.5072}}
                end={{x: 0.0072, y: 0.5072}}
                style={styles.submitButton}>
                <Text style={styles.submitButtonText}>发起拼车</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>

      <DateTimePickerModal
        isVisible={isDateTimePickerVisible}
        mode="datetime"
        onConfirm={handleConfirm}
        onCancel={hideDateTimePicker}
        minimumDate={new Date()}
        locale="zh-CN"
        confirmTextIOS="确定"
        cancelTextIOS="取消"
        is24Hour={true}
        headerTextIOS="选择出发时间"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabContentContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f7f7f7',
    borderRadius: 20,
    padding: 4,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 18,
  },
  activeTab: {
    backgroundColor: '#EBE9FF',
  },
  tabText: {
    fontSize: 16,
    color: '#888',
    marginLeft: 8,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6c5ce7',
    fontWeight: 'bold',
  },
  icon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#888',
  },
  activeIcon: {
    tintColor: '#6c5ce7',
  },
  contentContainer: {
    paddingHorizontal: 5,
  },
  locationRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationInputsWrapper: {
    flex: 1,
    marginLeft: 8,
  },
  starts_endImage: {
    width: 18,
    height: 70,
    resizeMode: 'contain',
    marginLeft: 5,
  },
  inputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: 48,
    justifyContent: 'center',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 15,
    textAlignVertical: 'center',
    marginLeft: 10,
    paddingRight: 5,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    height: 48,
  },
  dateTimeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.6,
    paddingRight: 5,
  },
  passengerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.4,
    marginLeft: 5,
  },
  touchableInput: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  dateTimeText: {
    paddingVertical: 0,
    textAlignVertical: 'center',
    height: '100%',
  },
  input: {
    fontSize: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: 48,
    color: '#333',
    flex: 1,
    marginLeft: 10,
    paddingVertical: 0,
    paddingBottom: 5,
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  sliderLabel:{
    fontSize: 15,
    color: '#BDBDBD',
    marginLeft: 10,
  },
  sliderValue: {
    marginTop: 5,
    fontSize: 15,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    width: '25%',
    marginLeft: 10,
  },
  slider: {
    width: '70%',
    height: 40,
  },
  submitButton: {
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default TabContent;