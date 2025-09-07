import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 引入AsyncStorage用于存储token

import BASE_URL from '../../config'; // 引入后端URL

const {width, height} = Dimensions.get('window');

const Login = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await fetch(`${BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mail: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 存储token到缓存
        await AsyncStorage.setItem('token', data.token);
        // 跳转到主页面
        navigation.navigate('Home');
      }
      else{
        Alert.alert('失败', '登录失败，用户名或密码错误');
      }
    } catch (error) {
      console.error('登录失败:', error);
      Alert.alert('提示', '登录失败，请稍后再试！');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logoImage}
        />
        <Text style={styles.logoText}>PINTU</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.title}>欢迎回来！</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.registerLink}>
          <Text
            style={styles.registerLinkText}
            onPress={() => navigation.navigate('Register')}>
            还没有账户？立即注册
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="电子邮箱"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={handleLogin}
        >
          <LinearGradient
            colors={['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']}
            start={{x: 0.9928, y: 0.5072}}
            end={{x: 0.0072, y: 0.5072}}
            style={styles.button}
          >
            <Text style={styles.buttonText}>登录</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: width * 0.05, // 左右边距适配
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.05,
    marginBottom: 10,
  },
  logoImage: {
    width: width * 0.5,
    height: width * 0.5,
    opacity: 1,
  },
  logoText: {
    fontSize: 18,
    color: '#3f2860',
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'left',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  registerLink: {
    marginBottom: 20,
  },
  registerLinkText: {
    color: '#6c5ce7',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 10,
    marginBottom: 20,
    fontSize: 16,
    width: '100%', // 输入框占满宽度
  },
  button: {
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Login;
