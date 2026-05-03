package com.tutorschedule.local.datasource

import com.tutorschedule.data.datasource.TeacherLocalDataSource
import com.tutorschedule.data.model.TeacherDataModel
import com.tutorschedule.local.dao.TeacherDao
import com.tutorschedule.local.entity.TeacherEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoomTeacherDataSource @Inject constructor(
    private val teacherDao: TeacherDao
) : TeacherLocalDataSource {

    override suspend fun getAllTeachers(): List<TeacherDataModel> {
        return teacherDao.getAll().map { it.toDataModel() }
    }

    override suspend fun getTeacher(id: String): TeacherDataModel? {
        return teacherDao.getById(id)?.toDataModel()
    }

    override fun observeAllTeachers(): Flow<List<TeacherDataModel>> {
        return teacherDao.observeAll().map { list -> list.map { it.toDataModel() } }
    }

    private fun TeacherEntity.toDataModel(): TeacherDataModel = TeacherDataModel(
        id = id,
        name = name,
        subjectCodes = try {
            kotlinx.serialization.json.Json.decodeFromString<List<String>>(subjectCodesJson)
        } catch (_: Exception) { emptyList() },
        availabilityJson = availabilityJson,
        maxDailyLessons = maxDailyLessons,
        uiColorArgb = uiColorArgb,
        notes = notes
    )
}
