// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "VibeMesh",
    platforms: [
        .iOS(.v14)
    ],
    products: [
        .library(
            name: "VibeMesh",
            targets: ["VibeMesh"]
        ),
    ],
    dependencies: [
        // No external dependencies - privacy-first design
    ],
    targets: [
        .target(
            name: "VibeMesh",
            dependencies: [],
            path: ".",
            sources: ["VibeMesh.swift"],
            resources: [
                .copy("PrivacyInfo.xcprivacy")
            ],
            swiftSettings: [
                .enableUpcomingFeature("BareSlashRegexLiterals"),
                .enableUpcomingFeature("ConciseMagicFile"),
                .enableUpcomingFeature("ExistentialAny"),
                .enableUpcomingFeature("ForwardTrailingClosures"),
                .enableUpcomingFeature("ImplicitOpenExistentials"),
                .enableUpcomingFeature("StrictConcurrency"),
                .unsafeFlags(["-cross-module-optimization"], .when(configuration: .release))
            ]
        ),
        .testTarget(
            name: "VibeMeshTests",
            dependencies: ["VibeMesh"],
            path: "Tests"
        ),
    ]
)