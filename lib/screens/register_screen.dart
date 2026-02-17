import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'privacy_policy_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);

  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF171728), Color(0xFF0A0075), Color(0xFF696969)],
            stops: [0.0, 0.53, 1.0],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: IntrinsicHeight(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Spacer(),
                        Center(
                          child: Image.asset(
                            'assets/images/logo.png',
                            height: 150,
                            width: 150,
                          ),
                        ),
                        const SizedBox(height: 40),
                        const Text(
                          'Username',
                          style: TextStyle(color: Colors.white70, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _usernameController,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(
                              Icons.person_outline,
                              color: Colors.white70,
                            ),
                            hintText: 'Username',
                            hintStyle: const TextStyle(color: Colors.white),
                            fillColor: const Color(0xFF2A2A40),
                            filled: true,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Email',
                          style: TextStyle(color: Colors.white70, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _emailController,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(
                              Icons.email_outlined,
                              color: Colors.white70,
                            ),
                            hintText: 'Email or Phone Number',
                            hintStyle: const TextStyle(color: Colors.white),
                            fillColor: const Color(0xFF2A2A40),
                            filled: true,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Password',
                          style: TextStyle(color: Colors.white70, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(
                              Icons.lock_outline,
                              color: Colors.white70,
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                                color: Colors.white70,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscurePassword = !_obscurePassword;
                                });
                              },
                            ),
                            hintText: 'Password',
                            hintStyle: const TextStyle(color: Colors.white),
                            fillColor: const Color(0xFF2A2A40),
                            filled: true,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Confirm Password',
                          style: TextStyle(color: Colors.white70, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _confirmPasswordController,
                          obscureText: _obscureConfirmPassword,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(
                              Icons.lock_outline,
                              color: Colors.white70,
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscureConfirmPassword
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                                color: Colors.white70,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscureConfirmPassword =
                                      !_obscureConfirmPassword;
                                });
                              },
                            ),
                            hintText: 'Confirm Password',
                            hintStyle: const TextStyle(color: Colors.white),
                            fillColor: const Color(0xFF2A2A40),
                            filled: true,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () {
                              Navigator.pop(context); // Go back to Login
                            },
                            child: const Text(
                              'Already have an account?',
                              style: TextStyle(
                                color: Color(0xFF3B82F6),
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton(
                          onPressed: () {
                            // TODO: Implement registration logic
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF3B82F6),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                          ),
                          child: Text(
                            'Register',
                            style: GoogleFonts.poppins(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Column(
                          children: [
                            const Text(
                              'by signing up you agree to our',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                TextButton(
                                  onPressed: () {},
                                  child: const Text(
                                    'terms of Service',
                                    style: TextStyle(
                                      color: Color(0xFFEAB308),
                                      fontSize: 12,
                                    ), // Assuming yellow/gold link color
                                  ),
                                ),
                                const Text(
                                  '|',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12,
                                  ),
                                ),
                                TextButton(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) =>
                                            const PrivacyPolicyScreen(),
                                      ),
                                    );
                                  },
                                  child: const Text(
                                    'Privacy Policy',
                                    style: TextStyle(
                                      color: Color(0xFFEAB308),
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const Spacer(),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
