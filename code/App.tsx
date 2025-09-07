import 'react-native-gesture-handler';
import React from 'react';
import { TouchableOpacity, Image } from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import WelcomeScreen from './src/screens/welcome';
import RegisterScreen from './src/screens/register';
import LoginScreen from './src/screens/login';
import HomeScreen from './src/screens/home';
import SearchScreen from './src/screens/search';
import SquareScreen from './src/screens/square';
import SquareDetailScreen from './src/screens/square_detail';
import AddVehicleScreen from './src/screens/add_vehicle';
import MyVehicleScreen from './src/screens/my_vehicle';
import ReviewScreen from './src/screens/review';
import ProfileScreen from './src/screens/profile';
import EditProfileScreen from './src/screens/edit_profile';
import MyGroupsScreen from './src/screens/my_groups';
import GroupChatScreen from './src/screens/group_chat'


const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{
            headerShown: true,
            title: '选择地点',
            headerTitleAlign: 'center',
            headerStyle: {
              elevation: 0, 
              shadowOpacity: 0, 
            },
          }}
        />
        <Stack.Screen
          name="Square"
          component={SquareScreen}
          options={{
            headerShown: true,
            title: '拼途广场',
            headerTitleAlign: 'center',
            headerStyle: {
              elevation: 0, 
              shadowOpacity: 0, 
            },
          }}
        />
        <Stack.Screen
          name="SquareDetail"
          component={SquareDetailScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="AddVehicle"
          component={AddVehicleScreen}
          options={{
            headerShown: true, 
            title: '添加座驾',
            headerTitleAlign: 'center',
            headerStyle: {
              elevation: 0, 
              shadowOpacity: 0, 
            },
          }}
        />
        <Stack.Screen
          name="MyVehicle"
          component={MyVehicleScreen}
          options={{
            headerShown: true, 
            title: '我的座驾',
          }}
        />
        <Stack.Screen
          name="Review"
          component={ReviewScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{
            headerShown: true, 
            title: '编辑资料',
            headerTitleAlign: 'center',
            headerStyle: {
              elevation: 0, 
              shadowOpacity: 0, 
            },
          }}
        />
        <Stack.Screen
          name="MyGroups"
          component={MyGroupsScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen 
          name="GroupChat" 
          component={GroupChatScreen} 
          options={ {headerShown: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
