import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({Key? key}) : super(key: key);

  @override
  _ForgotPasswordScreenState createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final TextEditingController _recoveryEmailController =
      TextEditingController();

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
                          'Recovery Email',
                          style: TextStyle(color: Colors.white70, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _recoveryEmailController,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(
                              Icons.email_outlined,
                              color: Colors.white70,
                            ),
                            hintText: "What's your Email ?",
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
                        ElevatedButton(
                          onPressed: () {
                            // TODO: Implement password reset logic
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF3B82F6),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                          ),
                          child: Text(
                            'Send Reset Link',
                            style: GoogleFonts.poppins(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () {
                              // TODO: Implement resend functionality
                            },
                            child: const Text(
                              'send another link ?',
                              style: TextStyle(
                                color: Color(0xFF3B82F6),
                                fontSize: 14,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
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
