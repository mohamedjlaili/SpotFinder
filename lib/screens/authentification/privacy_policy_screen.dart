import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios,
           color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Privacy Policy',
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
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
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSection('1. What We Collect', [
                  'Personal info: Name, email, phone number, and account details',
                  'Bookings & usage: Your reservations and app activity',
                  'Device info: Your device type, OS, and IP address',
                  'Location (optional): Only if you allow it, to show nearby spots',
                ]),
                _buildSection('2. How We Use It', [
                  'To let you book and manage study/coworking spots',
                  'To improve the app and your experience',
                  'To send updates or support messages',
                ]),
                _buildSection('3. Sharing Your Info', [
                  'We don’t sell your data',
                  'Shared only with service partners or if required by law',
                  'Your booking info may be visible to others if you choose to share it',
                ]),
                _buildSection('4. Your Choices', [
                  'Update or delete your account anytime',
                  'Turn off location or notifications if you want',
                ]),
                _buildSection('5. Security', [
                  'We protect your data, but no online system is 100% secure',
                ]),
                _buildSection('6. Kids', ['SpotFinder is for users 13+ only']),
                _buildSection('7. Questions?', [
                  'Contact us anytime at:',
                  'Email: support@spotfinder.app.DZ',
                ]),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String title, List<String> items) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.poppins(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF3B82F6),
            ),
          ),
          const SizedBox(height: 12),
          ...items.map((item) {
            final isEmail = item.contains('Email:');
            return Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!title.contains('Questions'))
                    const Padding(
                      padding: EdgeInsets.only(top: 6.0, right: 8.0),
                      child: Icon(Icons.circle, size: 6, color: Colors.white70),
                    ),
                  Expanded(
                    child: Text(
                      item,
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        color: Colors.white,
                        height: 1.5,
                        fontWeight: isEmail
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
