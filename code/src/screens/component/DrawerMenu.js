import React,  {useState, useEffect} from 'react';
import {
  View, 
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';

const {width} = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../../config'; // 确认引入后端URL

const DrawerMenu = ({visible, onClose, navigation}) => {
  const translateX = React.useRef(new Animated.Value(-width)).current;
  const [userName,setUserName] = useState("拼途用户");

    //挂载时获取用户姓名
    useEffect(() => {
        const fetchUserName = async() => {
            try {
                const token = await AsyncStorage.getItem('token');
                const response = await fetch(`${BASE_URL}/users/name`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok){
                    const data = await response.json();
                    setUserName(data.user_name);
                    return;
                }
            }
            catch(error){}
        };
        fetchUserName();
    }, []);

    useEffect(() => {
        if (visible) {
        Animated.timing(translateX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
        } else {
        Animated.timing(translateX, {
            toValue: -width,
            duration: 300,
            useNativeDriver: true,
        }).start();
        }
    }, [visible]);

    const menuItems = [
        {
        title: '个人资料',
        icon: require('../../assets/icon-sidebar-profile.png'),
        onPress: () => navigation.navigate('Profile', {view: 'myself'})
        },
        {
        title: '我的座驾',
        icon: require('../../assets/icon-sidebar-vehicle.png'),
        onPress: () => navigation.navigate('MyVehicle')
        },
        {
        title: '我的群聊',
        icon: require('../../assets/icon-sidebar-chat.png'), 
        onPress: () => navigation.navigate('MyGroups')
        }
    ];

    return (
        <>
            {visible && (
                <TouchableOpacity 
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={onClose}
                    >
                    <Animated.View 
                        style={[
                        styles.drawer,
                        {transform: [{translateX}]}
                        ]}
                    >
                        {/* 头像和用户名 */}
                        <View style={styles.header}>
                        <Image 
                            source={require('../../assets/avatar.png')}
                            style={styles.avatar}
                        />
                        <View style={styles.textContainer}>
                            <Text style={styles.username}>{userName}</Text>
                            <Text style={styles.welcome}>您好，欢迎来到拼途</Text>
                        </View>
                        </View>
                        <View style={{borderBottomWidth:1, borderBottomColor: '#EAEAEA', marginHorizontal: 20,}}></View>
                        {/* 菜单项 */}
                        {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={item.onPress}
                        >
                            <Image source={item.icon} style={styles.menuIcon} />
                            <Text style={styles.menuText}>{item.title}</Text>
                        </TouchableOpacity>
                        ))}
                    </Animated.View>
                </TouchableOpacity>
            )}
        </>
    );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: '#fff',
    paddingTop: 50,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    flexDirection: 'row',
    paddingHorizontal: 30,
    gap: 20,
    justifyContent: 'flex-start'
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#383838',
    marginBottom: 10,
  },
  welcome: {
    fontSize: 16,
    color: '#BDBCBC',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuIcon: {
    width: 36,
    height: 36,
    marginHorizontal: 10,
    marginTop: 5,
  },
  menuText: {
    fontSize: 18,
    color: '#5A6165',
  },
});

export default DrawerMenu;