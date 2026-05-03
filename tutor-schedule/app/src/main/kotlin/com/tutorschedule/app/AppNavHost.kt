package com.tutorschedule.app

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.tutorschedule.feature.schedule.WeeklyScheduleScreen
import com.tutorschedule.navigation.ScheduleNavigation

/**
 * 应用导航图 — 组装所有 Feature 路由
 */
@Composable
fun AppNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier,
    startDestination: String = "schedule_weekly"
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        // 排课周视图
        composable(
            route = "schedule_weekly?weekOffset={weekOffset}",
            arguments = listOf(
                navArgument("weekOffset") {
                    type = NavType.IntType
                    defaultValue = 0
                }
            )
        ) {
            WeeklyScheduleScreen(
                onNavigateToLessonDetail = { lessonId ->
                    navController.navigate("schedule_daily/$lessonId")
                },
                onNavigateToCreateLesson = { day, hour ->
                    navController.navigate("schedule_create?day=$day&hour=$hour")
                }
            )
        }

        // 排课日视图
        composable(
            route = "schedule_daily/{dateIso}",
            arguments = listOf(
                navArgument("dateIso") { type = NavType.StringType }
            )
        ) {
            // DailyScheduleScreen(dateIso = it.arguments?.getString("dateIso") ?: "")
        }
    }
}
