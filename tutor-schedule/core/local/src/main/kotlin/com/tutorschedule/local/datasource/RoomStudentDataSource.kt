package com.tutorschedule.local.datasource

import com.tutorschedule.data.datasource.StudentLocalDataSource
import com.tutorschedule.data.model.StudentDataModel
import com.tutorschedule.local.dao.StudentDao
import com.tutorschedule.local.entity.StudentEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoomStudentDataSource @Inject constructor(
    private val studentDao: StudentDao
) : StudentLocalDataSource {

    override suspend fun getAllStudents(): List<StudentDataModel> {
        return studentDao.getAll().map { it.toDataModel() }
    }

    override suspend fun getStudent(id: String): StudentDataModel? {
        return studentDao.getById(id)?.toDataModel()
    }

    override suspend fun insertStudent(student: StudentDataModel) {
        studentDao.insert(student.toEntity())
    }

    override suspend fun updateStudent(student: StudentDataModel) {
        studentDao.update(student.toEntity())
    }

    override suspend fun deleteStudent(id: String) {
        studentDao.delete(id)
    }

    override fun observeAllStudents(): Flow<List<StudentDataModel>> {
        return studentDao.observeAll().map { list -> list.map { it.toDataModel() } }
    }

    private fun StudentEntity.toDataModel(): StudentDataModel = StudentDataModel(
        id = id,
        name = name,
        gradeCode = gradeCode,
        enrolledSubjectCodes = try {
            kotlinx.serialization.json.Json.decodeFromString<List<String>>(enrolledSubjectsJson)
        } catch (_: Exception) { emptyList() },
        parentName = parentName,
        parentPhone = parentPhone,
        remainingHoursJson = remainingHoursJson,
        notes = notes,
        createdAtMillis = createdAt,
        updatedAtMillis = updatedAt
    )

    private fun StudentDataModel.toEntity(): StudentEntity = StudentEntity(
        id = id,
        name = name,
        gradeCode = gradeCode,
        enrolledSubjectsJson = kotlinx.serialization.json.Json.encodeToString(enrolledSubjectCodes),
        parentName = parentName,
        parentPhone = parentPhone,
        remainingHoursJson = remainingHoursJson,
        notes = notes,
        createdAt = createdAtMillis,
        updatedAt = updatedAtMillis
    )
}
