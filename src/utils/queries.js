const notesQuery = `
SELECT project_id, created_at, deleted_at, updated_at FROM notes WHERE 
DATE(created_at) = CURDATE() OR 
DATE(updated_at) = CURDATE() OR 
DATE(deleted_at) = CURDATE();
`;

const photosQuery = `
SELECT project_id, created_at, deleted_at, updated_at FROM photos WHERE 
DATE(created_at) = CURDATE() OR 
DATE(updated_at) = CURDATE() OR 
DATE(deleted_at) = CURDATE();
`;

const damagesQuery = `
SELECT project_id, created_at, deleted_at, updated_at FROM damage_causes WHERE 
DATE(created_at) = CURDATE() OR 
DATE(updated_at) = CURDATE() OR 
DATE(deleted_at) = CURDATE();
`;

const equipmentQuery = `
SELECT project_id, created_at, deleted_at, updated_at FROM equipment WHERE 
DATE(created_at) = CURDATE() OR 
DATE(updated_at) = CURDATE() OR 
DATE(deleted_at) = CURDATE();
`;

const atmosphericLogsQuery = `
SELECT project_id, created_at, deleted_at, updated_at FROM atmospheric_logs WHERE 
DATE(created_at) = CURDATE() OR 
DATE(updated_at) = CURDATE() OR 
DATE(deleted_at) = CURDATE();
`;

//add updated_at? 
const todaysReportsQuery = `
SELECT project_id, created_at FROM reports WHERE DATE(created_at) = CURDATE();
`

export default {
    notesQuery,
    photosQuery,
    damagesQuery,
    equipmentQuery,
    atmosphericLogsQuery,
    todaysReportsQuery
};

// INSERT INTO equipment (name, is_standard, project_id, created_at, updated_at) 
// VALUES ('Test Equipment', 1, 3235, NOW(), NOW());