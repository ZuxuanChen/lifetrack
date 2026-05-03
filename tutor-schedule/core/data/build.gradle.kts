plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.tutorschedule.data"
    compileSdk = 34
    defaultConfig { minSdk = 26 }
    kotlinOptions { jvmTarget = "1.8" }
}

dependencies {
    implementation(project(":core:common"))
    implementation(project(":core:domain"))

    // Hilt
    implementation("com.google.dagger:hilt-android:2.51.1")
    ksp("com.google.dagger:hilt-compiler:2.51.1")

    // kotlinx-serialization（Mapper 使用）
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.0")
}
