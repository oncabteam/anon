Pod::Spec.new do |spec|
  spec.name              = 'VibeMesh'
  spec.version           = '1.0.0'
  spec.license           = { :type => 'MIT', :file => 'LICENSE' }
  spec.homepage          = 'https://github.com/vibemesh/universal-sdk'
  spec.authors           = { 'VibeMesh' => 'support@vibemesh.io' }
  spec.summary           = 'Universal analytics SDK with automatic event tracking and privacy-first design'
  spec.description       = <<-DESC
                           VibeMesh Universal SDK provides comprehensive automatic event tracking 
                           for iOS apps with privacy-first design. Track user interactions, 
                           screen views, and custom events with minimal setup.
                           DESC
  spec.source            = { :git => 'https://github.com/vibemesh/universal-sdk.git', :tag => spec.version }
  spec.documentation_url = 'https://docs.vibemesh.io/ios'

  spec.ios.deployment_target = '14.0'
  spec.swift_version = '5.0'

  spec.source_files = 'platforms/ios/*.swift'
  
  spec.frameworks = 'Foundation', 'UIKit', 'CoreLocation'
  
  spec.requires_arc = true

  # Optional dependencies
  spec.weak_frameworks = 'UserNotifications', 'Network'

  # Privacy manifest
  spec.resource_bundles = {
    'VibeMesh' => ['platforms/ios/PrivacyInfo.xcprivacy']
  }
end