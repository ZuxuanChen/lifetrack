package com.tutorschedule.feature.schedule

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.AlertDialog
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tutorschedule.common.TutorException
import com.tutorschedule.common.WeekRange
import com.tutorschedule.designsystem.theme.tutorColors
import kotlinx.coroutines.flow.Flow
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/**
 * 周视图排课主页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WeeklyScheduleScreen(
    viewModel: ScheduleViewModel = hiltViewModel(),
    snackbarHostState: SnackbarHostState = remember { SnackbarHostState() },
    onNavigateToLessonDetail: (String) -> Unit = {},
    onNavigateToCreateLesson: (DayOfWeek?, Int?) -> Unit = { _, _ -> }
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val timeZone = TimeZone.currentSystemDefault()

    // 收集 Effect
    var showConflictDialog by remember { mutableStateOf(false) }
    var conflictDialogData by remember { mutableStateOf(emptyList<ConflictUiModel>()) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is ScheduleEffect.ShowToast -> {
                    snackbarHostState.showSnackbar(effect.message)
                }
                is ScheduleEffect.ShowConflictDialog -> {
                    conflictDialogData = effect.conflicts
                    showConflictDialog = true
                }
                is ScheduleEffect.NavigateToLessonDetail -> {
                    onNavigateToLessonDetail(effect.lessonId)
                }
                is ScheduleEffect.NavigateToCreateLesson -> {
                    onNavigateToCreateLesson(effect.initialDay, effect.initialHour)
                }
                ScheduleEffect.RequestNotificationPermission -> {
                    // 权限请求应在 Activity 层处理，此处留空
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("排课表", style = MaterialTheme.typography.headlineMedium)
                },
                actions = {
                    IconButton(onClick = { viewModel.onIntent(ScheduleIntent.Refresh) }) {
                        Icon(Icons.Default.CalendarToday, contentDescription = "今天")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = {
                    viewModel.onIntent(
                        ScheduleIntent.EmptySlotClicked(
                            TimeSlotUiModel(DayOfWeek.MONDAY, 9, 0, 10, 30)
                        )
                    )
                },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("新建课程") }
            )
        }
    ) { padding ->
        // 冲突弹窗
        if (showConflictDialog) {
            AlertDialog(
                onDismissRequest = { showConflictDialog = false },
                title = { Text("排课冲突") },
                text = {
                    Column {
                        conflictDialogData.forEach { conflict ->
                            Text(
                                text = "• ${conflict.message}",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(vertical = 2.dp)
                            )
                        }
                    }
                },
                confirmButton = {
                    Text(
                        text = "知道了",
                        modifier = Modifier.clickable { showConflictDialog = false },
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    )
                }
            )
        }

        when (val state = uiState) {
            is ScheduleUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is ScheduleUiState.Success -> {
                WeeklyScheduleContent(
                    state = state,
                    onIntent = viewModel::onIntent,
                    timeZone = timeZone,
                    modifier = Modifier.padding(padding)
                )
            }
            is ScheduleUiState.Error -> {
                ErrorContent(
                    error = state.exception,
                    onRetry = { viewModel.onIntent(ScheduleIntent.Refresh) },
                    modifier = Modifier.padding(padding)
                )
            }
        }
    }
}

@Composable
private fun WeeklyScheduleContent(
    state: ScheduleUiState.Success,
    onIntent: (ScheduleIntent) -> Unit,
    timeZone: TimeZone,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxSize()) {
        // 周导航栏
        WeekNavigator(
            currentWeek = state.currentWeek,
            onPrevious = { onIntent(ScheduleIntent.LoadPreviousWeek) },
            onNext = { onIntent(ScheduleIntent.LoadNextWeek) },
            onToday = { onIntent(ScheduleIntent.LoadCurrentWeek) },
            timeZone = timeZone
        )

        // 冲突警告条
        if (state.conflicts.isNotEmpty()) {
            ConflictBanner(
                count = state.conflicts.size,
                onClick = { /* 展开冲突详情 */ }
            )
        }

        // 核心：周视图时间表
        WeeklyTimeTable(
            lessons = state.lessons,
            isDragging = state.isDragging,
            onLessonClick = { lessonId -> onIntent(ScheduleIntent.LessonClicked(lessonId)) },
            onLessonDragStart = { lessonId -> onIntent(ScheduleIntent.StartDragLesson(lessonId)) },
            onLessonDragEnd = { lessonId, slot ->
                onIntent(ScheduleIntent.MoveLesson(lessonId, slot))
            },
            onEmptySlotClick = { slot -> onIntent(ScheduleIntent.EmptySlotClicked(slot)) }
        )
    }
}

@Composable
private fun WeekNavigator(
    currentWeek: WeekRange,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onToday: () -> Unit,
    timeZone: TimeZone
) {
    val startDate = currentWeek.start.toLocalDateTime(timeZone).date
    val endDate = currentWeek.end.toLocalDateTime(timeZone).date

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        IconButton(onClick = onPrevious) {
            Icon(Icons.Default.ArrowBack, contentDescription = "上一周")
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "${startDate.monthNumber}月${startDate.dayOfMonth}日 - ${endDate.monthNumber}月${endDate.dayOfMonth}日",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "${startDate.year}年",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        IconButton(onClick = onNext) {
            Icon(Icons.Default.ArrowForward, contentDescription = "下一周")
        }
    }
}

@Composable
private fun ConflictBanner(
    count: Int,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .background(MaterialTheme.colorScheme.errorContainer, RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "⚠️",
            fontSize = 16.sp
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "检测到 $count 处排课冲突，点击查看详情",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onErrorContainer
        )
    }
}

@Composable
private fun WeeklyTimeTable(
    lessons: List<LessonUiModel>,
    isDragging: Boolean,
    onLessonClick: (String) -> Unit,
    onLessonDragStart: (String) -> Unit,
    onLessonDragEnd: (String, TimeSlotUiModel) -> Unit,
    onEmptySlotClick: (TimeSlotUiModel) -> Unit
) {
    val density = LocalDensity.current
    val slotHeight = 60.dp  // 每30分钟60dp
    val startHour = 8
    val endHour = 22
    val totalSlots = (endHour - startHour) * 2  // 每30分钟一个格子

    Row(modifier = Modifier.fillMaxSize()) {
        // 左侧：时间标尺
        TimeRulerColumn(
            startHour = startHour,
            endHour = endHour,
            slotHeight = slotHeight
        )

        // 右侧：7天网格（可横向滑动）
        LazyRow(modifier = Modifier.fillMaxSize()) {
            items(DayOfWeek.entries.toList()) { day ->
                DayScheduleColumn(
                    day = day,
                    startHour = startHour,
                    endHour = endHour,
                    slotHeight = slotHeight,
                    lessons = lessons.filter { it.dayOfWeek == day },
                    isDragging = isDragging,
                    onLessonClick = onLessonClick,
                    onLessonDragStart = onLessonDragStart,
                    onLessonDragEnd = onLessonDragEnd,
                    onEmptySlotClick = onEmptySlotClick
                )
            }
        }
    }
}

@Composable
private fun TimeRulerColumn(
    startHour: Int,
    endHour: Int,
    slotHeight: Dp
) {
    Column(
        modifier = Modifier
            .width(48.dp)
            .fillMaxHeight()
            .padding(top = 40.dp)  // 对齐日期头部高度
    ) {
        for (hour in startHour until endHour) {
            Box(
                modifier = Modifier.height(slotHeight * 2),
                contentAlignment = Alignment.TopCenter
            ) {
                Text(
                    text = "${hour.toString().padStart(2, '0')}:00",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
    }
}

@Composable
private fun DayScheduleColumn(
    day: DayOfWeek,
    startHour: Int,
    endHour: Int,
    slotHeight: Dp,
    lessons: List<LessonUiModel>,
    isDragging: Boolean,
    onLessonClick: (String) -> Unit,
    onLessonDragStart: (String) -> Unit,
    onLessonDragEnd: (String, TimeSlotUiModel) -> Unit,
    onEmptySlotClick: (TimeSlotUiModel) -> Unit
) {
    val dayNames = mapOf(
        DayOfWeek.MONDAY to "周一",
        DayOfWeek.TUESDAY to "周二",
        DayOfWeek.WEDNESDAY to "周三",
        DayOfWeek.THURSDAY to "周四",
        DayOfWeek.FRIDAY to "周五",
        DayOfWeek.SATURDAY to "周六",
        DayOfWeek.SUNDAY to "周日"
    )

    Column(
        modifier = Modifier
            .width(120.dp)
            .fillMaxHeight()
    ) {
        // 日期头部
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(40.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = dayNames[day] ?: "",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium
            )
        }

        // 课程格子
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(slotHeight * (endHour - startHour) * 2)
        ) {
            // 空白格子（可点击创建）
            for (hour in startHour until endHour) {
                for (half in 0..1) {
                    val minute = half * 30
                    val slot = TimeSlotUiModel(
                        dayOfWeek = day,
                        startHour = hour,
                        startMinute = minute,
                        endHour = if (minute == 30) hour + 1 else hour,
                        endMinute = if (minute == 30) 0 else 30
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(slotHeight)
                            .offset(y = ((hour - startHour) * 2 + half) * slotHeight)
                            .clickable { onEmptySlotClick(slot) }
                    )
                }
            }

            // 课程卡片
            lessons.forEach { lesson ->
                DraggableLessonCard(
                    lesson = lesson,
                    startHour = startHour,
                    slotHeight = slotHeight,
                    isDraggingEnabled = !isDragging,
                    onClick = { onLessonClick(lesson.id) },
                    onDragStart = { onLessonDragStart(lesson.id) },
                    onDragEnd = { slot -> onLessonDragEnd(lesson.id, slot) }
                )
            }
        }
    }
}

@Composable
private fun DraggableLessonCard(
    lesson: LessonUiModel,
    startHour: Int,
    slotHeight: Dp,
    isDraggingEnabled: Boolean,
    onClick: () -> Unit,
    onDragStart: () -> Unit,
    onDragEnd: (TimeSlotUiModel) -> Unit
) {
    val density = LocalDensity.current
    var offsetY by remember { mutableFloatStateOf(0f) }
    var isDragging by remember { mutableStateOf(false) }

    // 计算卡片高度和位置
    val startMinutesFromDayStart =
        (lesson.startTime.hour - startHour) * 60 + lesson.startTime.minute
    val endMinutesFromDayStart =
        (lesson.endTime.hour - startHour) * 60 + lesson.endTime.minute
    val durationMinutes = endMinutesFromDayStart - startMinutesFromDayStart
    val cardHeight = with(density) { (durationMinutes / 30f * slotHeight.toPx()).toDp() }
    val topOffset = with(density) { (startMinutesFromDayStart / 30f * slotHeight.toPx()).toDp() }

    // 颜色
    val cardColor = Color(lesson.colorArgb)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 2.dp)
            .height(cardHeight)
            .offset {
                IntOffset(
                    x = 0,
                    y = with(density) { (topOffset.toPx() + offsetY).toInt() }
                )
            }
            .then(
                if (isDraggingEnabled) {
                    Modifier.pointerInput(lesson.id) {
                        detectDragGesturesAfterLongPress(
                            onDragStart = {
                                isDragging = true
                                onDragStart()
                            },
                            onDragEnd = {
                                isDragging = false
                                // 计算落点时间段
                                val draggedMinutes = (offsetY / slotHeight.toPx() * 30).toInt()
                                val newStartMin = startMinutesFromDayStart + draggedMinutes
                                val newStartHour = startHour + newStartMin / 60
                                val newStartMinute = newStartMin % 60
                                val newEndMin = newStartMin + durationMinutes
                                val newEndHour = startHour + newEndMin / 60
                                val newEndMinute = newEndMin % 60

                                val newSlot = TimeSlotUiModel(
                                    dayOfWeek = lesson.dayOfWeek,
                                    startHour = newStartHour,
                                    startMinute = newStartMinute,
                                    endHour = newEndHour,
                                    endMinute = newEndMinute
                                )
                                offsetY = 0f
                                onDragEnd(newSlot)
                            },
                            onDrag = { change, dragAmount ->
                                change.consume()
                                offsetY += dragAmount.y
                            }
                        )
                    }
                } else Modifier
            )
            .clickable(onClick = onClick)
            .shadow(
                elevation = if (isDragging) 8.dp else 1.dp,
                shape = RoundedCornerShape(6.dp)
            )
            .zIndex(if (isDragging) 100f else 1f),
        colors = CardDefaults.cardColors(
            containerColor = if (isDragging) cardColor.copy(alpha = 0.8f) else cardColor
        ),
        shape = RoundedCornerShape(6.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 6.dp, vertical = 4.dp)
        ) {
            Text(
                text = lesson.subjectDisplay,
                color = Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = lesson.studentName,
                color = Color.White.copy(alpha = 0.9f),
                fontSize = 10.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (lesson.isRecurring) {
                Text(
                    text = "↻",
                    color = Color.White.copy(alpha = 0.7f),
                    fontSize = 9.sp
                )
            }
        }
    }
}

@Composable
private fun ErrorContent(
    error: TutorException,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "加载失败",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.error
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = error.message ?: "未知错误",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "点击重试",
            modifier = Modifier.clickable(onClick = onRetry),
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Medium
        )
    }
}
