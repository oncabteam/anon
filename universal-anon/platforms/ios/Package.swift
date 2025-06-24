// swift-tools-version: 5.7
// OnCabaret Anonymous Intent SDK for iOS

import PackageDescription

let package = Package(
    name: "AnonIntentSDK",
    platforms: [
        .iOS(.v13),
        .macOS(.v10_15),
        .tvOS(.v13),
        .watchOS(.v6)
    ],
    products: [
        .library(
            name: "AnonIntentSDK",
            targets: ["AnonIntentSDK"]
        ),
    ],
    dependencies: [
        // No external dependencies to maintain privacy and reduce attack surface
    ],
    targets: [
        .target(
            name: "AnonIntentSDK",
            dependencies: [],
            path: "Sources",
            exclude: ["Info.plist"],
            resources: [
                .process("Resources")
            ]
        ),
        .testTarget(
            name: "AnonIntentSDKTests",
            dependencies: ["AnonIntentSDK"],
            path: "Tests"
        ),
    ]
)