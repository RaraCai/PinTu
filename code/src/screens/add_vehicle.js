import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TextInput, TouchableOpacity, Alert, Keyboard } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../config';

const { width, height } = Dimensions.get('window');

const AddVehicleScreen = ({ navigation }) => {
  const [category, setCategory] = useState('小轿车');
  const [plate, setPlate] = useState('');
  const [fuelConsumption, setFuelConsumption] = useState('');
  const [brand, setBrand] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 省份简称列表
  const provinceAbbreviation = [
    '京', '津', '冀', '晋', '蒙', '辽', '吉', '黑',
    '沪', '苏', '浙', '皖', '闽', '赣', '鲁', '豫',
    '鄂', '湘', '粤', '桂', '琼', '川', '贵', '云',
    '渝', '藏', '陕', '甘', '青', '宁', '新', '台',
    '港', '澳'
  ];

  // 验证车牌号格式
  const validatePlate = (plate) => {
    // 去除空格
    const cleanPlate = plate.replace(/\s+/g, '');
    
    // 传统车牌格式：省份简称(1字) + 大写字母(1位) + 5位数字或字母
    const traditionalPattern = /^[京津沪渝冀晋蒙辽吉黑苏浙皖闽赣鲁豫鄂湘粤桂琼川贵云藏陕甘青宁新][A-Z][A-Z0-9]{5}$/;
    
    // 新能源车牌格式：省份简称(1字) + 大写字母(1位) + 6位数字或字母
    const newEnergyPattern = /^[京津沪渝冀晋蒙辽吉黑苏浙皖闽赣鲁豫鄂湘粤桂琼川贵云藏陕甘青宁新][A-Z](?:[0-9A-Z]{6})$/;
    
    // 检查省份简称是否有效
    const isValidProvince = provinceAbbreviation.includes(cleanPlate.charAt(0));
    
    // 检查车牌格式
    const isValidFormat = traditionalPattern.test(cleanPlate) || newEnergyPattern.test(cleanPlate);
    
    return isValidProvince && isValidFormat;
  };

  const handleAddVehicle = async () => {
    Keyboard.dismiss(); // 关闭键盘
    setIsSubmitting(true);

    // 输入验证
    if (!plate.trim()) {
      Alert.alert('提示', '请输入车牌号');
      setIsSubmitting(false);
      return;
    }

    if (!validatePlate(plate)) {
      Alert.alert('提示', '请输入有效的车牌号\n示例：\n传统车牌：京A12345\n新能源车牌：京A123456');
      setIsSubmitting(false);
      return;
    }

    if (!fuelConsumption.trim()) {
      Alert.alert('提示', '请输入油耗');
      setIsSubmitting(false);
      return;
    }

    const fuelValue = parseFloat(fuelConsumption);
    if (isNaN(fuelValue) || fuelValue <= 0) {
      Alert.alert('提示', '请输入有效的油耗数值（大于0的数字）');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('用户未登录');
      }

      const response = await fetch(`${BASE_URL}/cars/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          plate: plate.trim().replace(/\s+/g, ''), // 去除空格
          fuelConsumption: fuelValue,
          brand: brand.trim() || null
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('成功', '座驾添加成功', [
          { 
            text: '确定', 
            onPress: () => navigation.goBack() 
          }
        ]);
      } else {
        throw new Error(data.message || '添加座驾失败');
      }
    } catch (error) {
      console.error('添加座驾失败:', error);
      Alert.alert('错误', error.message || '添加座驾失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 紫色小框 */}
      <View style={styles.purpleBox}>
        <View style={styles.info}>
          <Image
            source={require('../assets/icon_car1.png')} 
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>座驾信息</Text> 
        </View>
      </View>

      {/* 车辆图标 */}
      <Image 
        source={require('../assets/icon_car2.png')} 
        style={styles.carIcon}
      />

      {/* 车型选择 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>车型</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={category}
            onValueChange={(itemValue) => setCategory(itemValue)}
            style={styles.picker}
            dropdownIconColor="#666"
          >
            <Picker.Item label="小轿车" value="小轿车" />
            <Picker.Item label="吉普车" value="吉普车" />
            <Picker.Item label="商务车" value="商务车" />
            <Picker.Item label="面包车" value="面包车" />
            <Picker.Item label="大型车" value="大型车" />
          </Picker>
        </View>
      </View>

      {/* 车牌号输入 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>车牌号</Text>
        <TextInput
          style={styles.input}
          placeholder="输入车牌号（如：京A12345）"
          placeholderTextColor="#BDBCBC"
          value={plate}
          onChangeText={setPlate}
          maxLength={20}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      {/* 油耗和品牌系列并列 */}
      <View style={styles.rowContainer}>
        {/* 油耗输入 */}
        <View style={styles.fuelInputContainer}>
          <Text style={styles.label}>油耗 / 百公里</Text>
          <TextInput
            style={styles.input}
            placeholder="0.0"
            placeholderTextColor="#BDBCBC"
            keyboardType="decimal-pad"
            value={fuelConsumption}
            onChangeText={(text) => {
              // 只允许数字和小数点
              const filteredText = text.replace(/[^0-9.]/g, '');
              // 最多保留2位小数
              if (filteredText.split('.')[1]?.length <= 2 || !filteredText.includes('.')) {
                setFuelConsumption(filteredText);
              }
            }}
            maxLength={6}
          />
        </View>

        {/* 品牌系列输入 */}
        <View style={styles.brandInputContainer}>
          <Text style={styles.label}>系列 / 品牌</Text>
          <TextInput
            style={styles.input}
            placeholder="输入品牌（如：大众速腾）"
            placeholderTextColor="#BDBCBC"
            value={brand}
            onChangeText={setBrand}
            maxLength={20}
            autoCorrect={false}
          />
        </View>
      </View>

      {/* 添加按钮 */}
      <TouchableOpacity 
        style={styles.addButtonContainer}
        onPress={handleAddVehicle}
        disabled={isSubmitting}
      >
        <LinearGradient
          colors={isSubmitting 
            ? ['rgba(153, 145, 246, 0.7)', 'rgba(117, 106, 237, 0.7)'] 
            : ['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']}
          start={{x: 0.9928, y: 0.5072}}
          end={{x: 0.0072, y: 0.5072}}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>
            {isSubmitting ? '添加中...' : '添加'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    position: 'relative',
    alignItems: 'center',
  },
  purpleBox: {
    position: 'absolute',
    top: height * 0.05,
    borderRadius: 16,
    backgroundColor: 'rgba(235, 233, 255, 1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    width: 20,
    height: 20,
    marginRight: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#877EF2',
    fontWeight: '500',
  },
  carIcon: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginTop: 90,
    marginBottom: 10,
    marginLeft: 10,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#BCBCBD',
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerContainer: {
    height: 40,
    justifyContent: 'center',
    borderBottomColor: '#D6D6D6',
    borderBottomWidth: 1,
  },
  picker: {
    width: '100%',
    padding: 5,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#D6D6D6',
    height: 48,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  fuelInputContainer: {
    width: '30%',
  },
  brandInputContainer: {
    width: '65%',
  },
  addButtonContainer: {
    width: '100%',
    height: 50,
    marginTop: 30,
    borderRadius: 25,
    overflow: 'hidden',
  },
  addButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddVehicleScreen;