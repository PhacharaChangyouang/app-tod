import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/splash_screen.dart';
import 'screens/password_login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/reminder_screen.dart';
import 'screens/sos_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/caregiver_home_screen.dart';
import 'screens/family_screen.dart';
import 'screens/history_screen.dart';
import 'utils/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(statusBarColor: Colors.transparent),
  );
  runApp(const AHAApp());
}

class AHAApp extends StatelessWidget {
  const AHAApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AHA - AI Health Assistant',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: '/splash',
      routes: {
        '/splash': (_) => const SplashScreen(),
        '/login': (_) => const PasswordLoginScreen(),
        '/home': (_) => const HomeScreen(),
        '/caregiver-home': (_) => const CaregiverHomeScreen(),
        '/reminders': (_) => const ReminderScreen(),
        '/sos': (_) => const SosScreen(),
        '/profile': (_) => const ProfileScreen(),
        '/family': (_) => const FamilyScreen(),
        '/history': (_) => const HistoryScreen(),
      },
    );
  }
}
