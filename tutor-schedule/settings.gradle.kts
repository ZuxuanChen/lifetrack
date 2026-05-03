pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "TutorSchedule"

include(
    ":app",
    ":core:common",
    ":core:domain",
    ":core:data",
    ":core:local",
    ":core:remote",
    ":design-system",
    ":core-navigation",
    ":feature:schedule",
    ":feature:student",
    ":feature:teacher",
    ":feature:settings"
)
