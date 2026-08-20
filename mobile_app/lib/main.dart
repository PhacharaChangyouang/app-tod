import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/splash_screen.dart';
import 'screens/otp_request_screen.dart';
import 'screens/otp_verify_screen.dart';
import 'screens/pin_setup_screen.dart';
import 'screens/home_screen.dart';
import 'screens/reminder_screen.dart';
import 'screens/sos_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/caregiver_home_screen.dart';
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
        '/otp-request': (_) => const OtpRequestScreen(),
        '/otp-verify': (_) => const OtpVerifyScreen(),
        '/pin-setup': (_) => const PinSetupScreen(),
        '/home': (_) => const HomeScreen(),
        '/caregiver-home': (_) => const CaregiverHomeScreen(),
        '/reminders': (_) => const ReminderScreen(),
        '/sos': (_) => const SosScreen(),
        '/profile': (_) => const ProfileScreen(),
      },
    );
  }
}
