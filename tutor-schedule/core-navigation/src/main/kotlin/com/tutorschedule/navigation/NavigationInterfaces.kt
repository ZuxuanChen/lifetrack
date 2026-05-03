package com.tutorschedule.navigation

import androidx.navigation.NamedNavArgument
import androidx.navigation.NavType
import androidx.navigation.navArgument

/**
 * 类型安全导航接口 — :core:navigation 模块
 *
 * 每个 Feature 模块通过 Hilt 注入对应的 Navigation 接口实现，
 * 实现类位于 :app 模块（提供实际的 NavGraph 组装）。
 */

interface ScheduleNavigation {
    val route: String
    val arguments: List<NamedNavArgument>
    fun createRoute(weekOffset: Int = 0): String
    fun createDailyRoute(dateIso: String): String
}

interface StudentNavigation {
    val route: String
    val detailRoute: String
    val detailArguments: List<NamedNavArgument>
    fun createDetailRoute(studentId: String): String
}

interface TeacherNavigation {
    val route: String
    val detailRoute: String
    val detailArguments: List<NamedNavArgument>
    fun createDetailRoute(teacherId: String): String
}

interface SettingsNavigation {
    val route: String
}

// === 实现类（位于 :app 模块）===

class ScheduleNavigationImpl : ScheduleNavigation {
    override val route = "schedule_weekly"
    override val arguments = listOf(
        navArgument("weekOffset") { type = NavType.IntType; defaultValue = 0 }
    )
    override fun createRoute(weekOffset: Int) = "$route?weekOffset=$weekOffset"
    override fun createDailyRoute(dateIso: String) = "schedule_daily/$dateIso"
}

class StudentNavigationImpl : StudentNavigation {
    override val route = "student_list"
    override val detailRoute = "student_detail/{studentId}"
    override val detailArguments = listOf(
        navArgument("studentId") { type = NavType.StringType }
    )
    override fun createDetailRoute(studentId: String) = "student_detail/$studentId"
}

class TeacherNavigationImpl : TeacherNavigation {
    override val route = "teacher_list"
    override val detailRoute = "teacher_detail/{teacherId}"
    override val detailArguments = listOf(
        navArgument("teacherId") { type = NavType.StringType }
    )
    override fun createDetailRoute(teacherId: String) = "teacher_detail/$teacherId"
}

class SettingsNavigationImpl : SettingsNavigation {
    override val route = "settings"
}
