import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../config';


const EditProfileScreen = ({navigation}) => {
    const [userInfo, setUserInfo] = useState({});
    const [inputUserInfo, setInputUserInfo] = useState({}); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 加载或刷新用户信息
    const loadUserInfo = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/users/info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({u_id: null}),
            });

            if (response.ok) {
                const data = await response.json();
                setUserInfo(data.user_info);
            } else {
                Alert.alert('错误', '获取用户信息失败，请稍后再试~');
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
            Alert.alert('错误', '网络错误，请检查您的网络连接~');
        }
    };

    // 提交修改的用户信息
    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('错误', '用户未登录，请先登录~');
                setIsSubmitting(false);
                return;
            }

            const response = await fetch(`${BASE_URL}/users/edit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(inputUserInfo),
            });

            if (response.ok) {
                Alert.alert('成功', '用户信息修改成功~', [
                    { text: 'OK', onPress: () => loadUserInfo() }
                ]);
                navigation.navigate('Profile',{view: 'myself', u_id: null}); // 返回个人信息页面
            } else {
                const errorData = await response.json();
                Alert.alert('错误', errorData.message || '修改用户信息失败，请稍后再试~');
            }
        } catch (error) {
            console.error('Error updating user info:', error);
            Alert.alert('错误', '网络错误，请检查您的网络连接~');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        // 页面挂载时加载用户信息
        loadUserInfo();
    },[]);

    useEffect(() => {
        if(userInfo){
            setInputUserInfo({
                u_name: userInfo.u_name || null,
                u_tel: userInfo.u_tel || null,
                u_email: userInfo.u_email || null,
            });
        } 
    }, [userInfo]);

    return(
        <View style={styles.container}>
            {/* 用户头像 */}
            <TouchableOpacity
                //onPress={() => {}}
                style={{alignItems: 'center', marginTop: 20}}
            >
                <Image
                    source={ require('../assets/avatar.png') }
                    style={styles.avatar}
                />
                <Text style={{color: '#877EF2', marginTop: 10}}>点击更换头像</Text>
            </TouchableOpacity>
            {/* 用户信息输入框 */}  
            <View style={styles.inputContainer}>
                {/* 用户名 */}
                <View>
                    <Text style={styles.inputLabel}>用户名</Text>
                    <TextInput
                        style={styles.inputField}
                        value={inputUserInfo.u_name || ''}
                        onChangeText={(text) => setInputUserInfo({...inputUserInfo, u_name: text})}
                        placeholder={inputUserInfo.u_name ? userInfo.u_name : '请输入用户名'}
                        placeholderTextColor={inputUserInfo.u_name ? '#383838' : '#BCBCBD'}
                    />
                </View>
                {/* 电话号码 */}
                <View>
                    <Text style={styles.inputLabel}>电话号码</Text>
                    <TextInput
                        style={styles.inputField}
                        value={inputUserInfo.u_tel || ''}
                        onChangeText={(text) => setInputUserInfo({...inputUserInfo, u_tel: text})}
                        placeholder={inputUserInfo.u_tel ? userInfo.u_tel : '请输入电话号码'}
                        placeholderTextColor={inputUserInfo.u_tel ? '#383838' : '#BCBCBD'}
                    />
                </View>
                {/* 电子邮箱 */}
                <View>
                    <Text style={styles.inputLabel}>电子邮箱</Text>
                    <TextInput
                        style={styles.inputField}
                        value={inputUserInfo.u_email || ''}
                        onChangeText={(text) => setInputUserInfo({...inputUserInfo, u_email: text})}
                        placeholder={inputUserInfo.u_email ? userInfo.u_email : '请输入电子邮箱'}
                        placeholderTextColor={inputUserInfo.u_email ? '#383838' : '#BCBCBD'}
                    />
                </View>
            </View>
            {/* 驾照图片 */}
            <TouchableOpacity style={styles.licenseContainer}>
                <Text style={{fontSize: 14, color: '#50565A'}}>驾驶执照</Text>
                {userInfo.u_license ? (
                    <Image
                        source={require('../assets/icon-license-ok.png')}
                        style={{ width: 20, height: 20 }}
                    />
                ) : (
                    <Text style={{color: '#BCBCBD', fontSize: 12, marginTop: 5}}>点击上传</Text>
                )}
            </TouchableOpacity>

            {/* 添加按钮 */}
            <TouchableOpacity 
                style={styles.addButtonContainer}
                onPress={handleSubmit}
                disabled={isSubmitting}
            >
                <LinearGradient
                    colors={
                    isSubmitting
                        ? ['#E1E1E1', '#E1E1E1']
                        : ['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']
                    }
                    start={{x: 0.9928, y: 0.5072}}
                    end={{x: 0.0072, y: 0.5072}}
                    style={styles.addButton}
                >
                    <Text style={styles.addButtonText}>
                        {isSubmitting ? '修改中...' : '确认修改'}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container:{
        flex: 1,
        backgroundColor: '#fff',
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        marginTop: 20,
        shadowColor: '#877EF2',
        shadowOffset: {
        width: 0,
        height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 50,
        elevation: 20,
    },
    inputContainer:{
        paddingHorizontal: 25,
        marginTop: 30,
        borderRadius: 10,
        paddingVertical: 20,
        gap: 20,
    },
    inputLabel:{
        fontSize: 12,
        color: '#BCBCBD',
    },
    inputField:{
        borderColor: '#D6D6D6',
        borderBottomWidth: 1,
        fontSize: 16,
    },
    addButtonContainer: {
        width: '90%',
        height: 50,
        marginTop: 30,
        borderRadius: 25,
        overflow: 'hidden',
        alignSelf: 'center',
        position: 'absolute',
        bottom: 50,
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
    licenseContainer:{
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        width: '90%',
        alignSelf: 'center',
        shadowColor: '#ccc',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
        justifyContent: 'space-between',
        flexDirection: 'row',
    }
});

export default EditProfileScreen;
