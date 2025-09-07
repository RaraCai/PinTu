import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../config';


const ProfileScreen = ({navigation, route}) => {
  const {view, u_id} = route.params;
  const [userInfo, setUserInfo] = useState({});

  // 页面挂载时获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('未登录', '请先登录以查看个人信息~');
          navigation.navigate('Login');
          return;
        }
        const response = await fetch(`${BASE_URL}/users/info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({u_id: u_id || null}),
        });
        if(response.ok) {
          const data = await response.json();
          setUserInfo(data.user_info);
        }
        else{
          Alert.alert('失败', '获取个人信息失败，请稍后再试~');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
  }, []); 

  return (
    <View style={styles.container}>
      {/* 页面头部 */}
      <View style={styles.headerCurtain}>
        <TouchableOpacity
          style={styles.backButtonContainer}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          }
        >
          <Image
            source={
              require('../assets/Icon-back.png')
            } 
            style={styles.backArrowIcon}
          />
          <Text style={styles.headerTitle}>{view === 'myself' ? '个人资料' : '用户资料'}</Text>
        </TouchableOpacity>
      </View>
      {/* 用户个人资料 */}
      <View style={styles.profileCard}>
        {/* 头像部分 */}
        <Image
          source={
            require('../assets/avatar.png')
          } 
          style={styles.avatar}
        />
        
        {/* 用户名和欢迎语 */}
        <Text style={styles.username}>{userInfo.u_name}</Text>
        <Text style={styles.welcome}>欢迎来到拼途</Text>

        {/* 拼车数据 */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userInfo.u_totalOrders || 0}</Text>
            <Text style={styles.statLabel}>拼车总次数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userInfo.u_driverOrders || 0}</Text>
            <Text style={styles.statLabel}>发起拼车</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userInfo.u_passengerOrders || 0}</Text>
            <Text style={styles.statLabel}>参与拼车</Text>
          </View>
        </View>

        {/* 用户评分和准时率 */}
        <View style={styles.ratingContainer}>
          <View style={styles.ratingItem}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Image 
                source={require('../assets/icon-profile-rating.png')}
                style={[styles.ratingIcon,{marginBottom: 6}]}
              />
              <Text style={styles.ratingNumber}>{userInfo.u_stars || '5.00'}</Text>
            </View>
            <Text style={styles.ratingLabel}>用户评分</Text>
          </View>
          <View style={styles.ratingItem}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center'}}>
              <Image 
                source={require('../assets/Icon_Chat.png')}
                style={styles.ratingIcon}
              />
              <Text style={styles.ratingNumber}>{userInfo.u_punctualRate || '100%'}%</Text>
            </View>
            <Text style={styles.ratingLabel}>准时到达</Text>
          </View>
        </View>

        {/* 底部陈列项 */}
        <View style={styles.row}>

          {/* 电话号码 */}
          <TouchableOpacity
            style={styles.rowButton}
          >
            <Image 
              source={require('../assets/icon-profile-star.png')}
              style={styles.rowIcon}
            />
            <Text style={styles.rowLabel}>电话号码</Text>
            <Text style={{fontSize: 14, color: '#000', fontWeight: '500'}}>{userInfo.u_tel || '暂未填写'}</Text>
          </TouchableOpacity>

          
          {/* 编辑资料，仅在查看自己的资料时显示 */}
          {view === 'myself' && (
            <TouchableOpacity
              style={styles.rowButton}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Image 
                source={require('../assets/icon-profile-star.png')}
                style={styles.rowIcon}
              />
              <Text style={styles.rowLabel}>编辑资料</Text>
              <Text style={{fontSize: 12, color: '#BDBCBC',}}>点击编辑</Text>
            </TouchableOpacity>
          )}
          
          
          {/* 驾照图片 */}
          <TouchableOpacity
            style={styles.rowButton}
            //onPress={() => navigation.navigate('LicenseImage')}
          >
            <Image 
              source={require('../assets/icon-profile-star.png')}
              style={styles.rowIcon}
            />
            <Text style={styles.rowLabel}>驾驶执照</Text>
            <Text style={{fontSize: 12, color: '#BDBCBC',}}>点击查看</Text>
          </TouchableOpacity>
        </View>
      </View>      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerCurtain: {
    backgroundColor: '#ffffff', 
    height: 75,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    justifyContent: 'space-between'
  },
  backButtonContainer: {
      flexDirection: 'row', 
      alignItems: 'center', 
  },
  backArrowIcon: {
      width: 22, 
      height: 22,
      resizeMode: 'contain',
      tintColor: '#333', 
      marginRight: 8, 
  },
  headerTitle: {
      fontSize: 17, 
      fontWeight: '600', 
      color: '#333',
  },
  profileCard: {
    backgroundColor: '#fff',
    height: Dimensions.get('window').height - 75, 
    marginTop: 100, // 为头像留出空间
    borderTopEndRadius: 32,
    borderTopStartRadius: 32,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#ccc',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    position: 'absolute',
    top: -42,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: '600',
    color: '#383838',
    marginTop: 40,
    marginBottom: 4,
  },
  welcome: {
    fontSize: 16,
    color: '#877EF2',
    marginBottom: 24,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginBottom: 32,
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#77808D',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
  },
  ratingItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  ratingIcon: {
    width: 24,
    height: 24,
  },
  ratingNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#383838',
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#BDBCBC',
  },
  row:{
    flex: 1,
    marginTop: 32,
    width: '90%',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',  
    justifyContent: 'flex-start', 
    paddingVertical: 10,
    width: '100%',  
    gap: 10,
  },
  rowLabel:{
   fontSize: 14,
   color: '#50565A'
  },
  rowIcon: {
    width: 32,
    height: 32, 
  },
});

export default ProfileScreen;
