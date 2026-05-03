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

// === 实现类（位于 :app 模块）===

class ScheduleNavigationImpl : ScheduleNavigation {
    override val route = "schedule_weekly"
    override val arguments = listOf(
        navArgument("weekOffset") { type = NavType.IntType; defaultValue = 0 }
    )
    override fun createRoute(weekOffset: Int) = "$route?weekOffset=$weekOffset"
    override fun createDailyRoute(dateIso: String) = "schedule_daily/$dateIso"
}
