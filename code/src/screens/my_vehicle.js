import React, {useState, useEffect, useCallback} from 'react';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { 
  View, 
  Text, 
  Image, 
  ScrollView, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  Alert, 
  Modal 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../config';

const { width, height } = Dimensions.get('window');

const MyVehicleScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { onSelectCar } = route.params || {}; 

  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);

  // 获取用户座驾列表
  const fetchUserCars = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('用户未登录');
      }

      const response = await fetch(`${BASE_URL}/cars/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setCars(data.data || []);
      } else {
        throw new Error(data.message || '获取座驾列表失败');
      }
    } catch (error) {
      console.error('获取座驾列表失败:', error);
      Alert.alert('错误', error.message || '获取座驾列表失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 删除座驾
  const deleteCar = async (carId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('用户未登录');
      }

      const response = await fetch(`${BASE_URL}/cars/delete/${carId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('成功', '座驾删除成功');
        fetchUserCars(); // 刷新列表
      } else {
        throw new Error(data.message || '删除座驾失败');
      }
    } catch (error) {
      console.error('删除座驾失败:', error);
      Alert.alert('错误', error.message || '删除座驾失败，请稍后再试');
    } finally {
      setModalVisible(false);
    }
  };

  // 初始化加载数据
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserCars();
    });
    return unsubscribe;
  }, [navigation]);

  // 打开操作浮层
  const openActionModal = (car) => {
    setSelectedCar(car);
    setModalVisible(true);
  };

  // 确认选择座驾
  const confirmSelection = () => {
    if(onSelectCar){
      onSelectCar(selectedCar);
    }
    setModalVisible(false);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* 显示座驾列表 */}
        {cars.length > 0 ? (
          cars.map((car) => (
            <TouchableOpacity 
              key={car.id}
              style={styles.vehicleBox}
              onPress={() => openActionModal(car)}
            >
              {/* 左侧图标 */}
              <Image 
                source={require('../assets/icon_car2.png')} 
                style={styles.carIcon}
              />
              
              {/* 右侧文字区域 */}
              <View style={styles.textContainer}>
                <Text style={styles.carModel}>
                  {car.brand || '未设置品牌'}
                </Text>
                <Text style={styles.carPlate}>车牌号 | {car.plate}</Text>
                <Text style={styles.carFuel}>油耗 | {car.fuelConsumption} L/Km</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无座驾信息</Text>
          </View>
        )}

        {/* 新增车辆按钮 */}
        <TouchableOpacity 
          style={styles.addVehicleBox}
          onPress={() => navigation.navigate('AddVehicle')}
        >
          <Image 
            source={require('../assets/icon-AddButton.png')} 
            style={styles.addButton}
          />
        </TouchableOpacity>
      </ScrollView>

      {/* 操作浮层 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>请选择操作</Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={confirmSelection}
            >
              <Text style={styles.modalButtonText}>确认选择</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.deleteButton]}
              onPress={() => deleteCar(selectedCar?.id)}
            >
              <Text style={styles.deleteButtonText}>删除座驾</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  vehicleBox: {
    flexDirection: 'row',
    width: width * 0.9,
    height: height * 0.12,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(135, 126, 242, 0.8)',
    elevation: 20,
    shadowColor: '#979797',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    marginBottom: 20,
    overflow: 'hidden',
    alignItems: 'center',
  },
  addVehicleBox: {
    width: width * 0.9,
    height: height * 0.12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    elevation: 20,
    shadowColor: '#979797',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  addButton: {
    width: 48,
    height: 48,
  },
  carIcon: {
    width: 110,
    height: 110,
    marginRight: 16,
    resizeMode: 'contain',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  carModel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#383838',
    marginBottom: 4,
  },
  carPlate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  carFuel: {
    fontSize: 14,
    color: '#666',
  },
  // 浮层样式
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: width * 0.8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  modalButton: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#877EF2',
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: '#fff',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    width: '100%',
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default MyVehicleScreen;