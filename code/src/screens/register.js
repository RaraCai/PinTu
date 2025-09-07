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

import BASE_URL from '../../config'; // 引入后端URL

const {width, height} = Dimensions.get('window');

const Register = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // 按钮状态

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert('注册失败','两次输入的密码不一致');
      return;
    }

    setIsSubmitting(true); // 禁用按钮

    try {
      const response = await fetch(`${BASE_URL}/users/register`, {
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
      Alert.alert('提示', `${data.message}`);

      if (response.ok) {
        navigation.navigate('Login'); // 注册成功后跳转到登录页面
      }
    } catch (error) {
      console.error('注册失败:', error);
      Alert.alert('提示', '注册失败，请稍后再试！');
    } finally {
      setIsSubmitting(false); // 恢复按钮状态
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
        <Text style={styles.title}>创建账户</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.loginLink}>
          <Text style={styles.loginLinkText}>已经有账户？立即登录</Text>
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

        <TextInput
          style={styles.input}
          placeholder="再次确认密码"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <TouchableOpacity
          onPress={!isSubmitting ? handleRegister : null} // 禁用时不触发点击事件
        >
          <LinearGradient
            colors={
              isSubmitting
                ? ['#E1E1E1', '#E1E1E1']
                : ['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']
            }
            start={{x: 0.9928, y: 0.5072}}
            end={{x: 0.0072, y: 0.5072}}
            style={[styles.button, isSubmitting && {opacity: 0.6}]} // 禁用时降低透明度
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? '注册中...' : '注册'}
            </Text>
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
    marginTop: height * 0.05, // 减小顶部间距，从 0.1 调整为 0.05
    marginBottom: 10, // 新增底部间距，可根据需要调整
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
  loginLink: {
    marginBottom: 20,
  },
  loginLinkText: {
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

export default Register;
