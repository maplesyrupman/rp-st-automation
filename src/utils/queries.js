const notesQuery = `
SELECT project_id FROM notes WHERE 
DATE(created_at) = CURDATE() OR 
DATE(updated_at) = CURDATE() OR 
DATE(deleted_at) = CURDATE();
`;

const photosQuery = `
SELECT project_id FROM photos WHERE 
DATE(created_at) = CURDATE() OR 
DATE(updated_at) = CURDATE() OR 
DATE(deleted_at) = CURDATE();
`;

const damagesQuery = `
SELECT project_id FROM damage_causes WHERE 
DATE(created_at) = CURDATE() OR 
DATE(updated_at) = CURDATE() OR 
DATE(deleted_at) = CURDATE();
`;

const equipmentQuery = `
SELECT project_id FROM equipment WHERE 
DATE(created_at) = CURDATE() OR 
DATE(updated_at) = CURDATE() OR 
DATE(deleted_at) = CURDATE();
`;

const atmosphericLogsQuery = `
SELECT project_id FROM atmospheric_logs WHERE 
DATE(created_at) = CURDATE() OR 
DATE(updated_at) = CURDATE() OR 
DATE(deleted_at) = CURDATE();
`;

module.exports = {
    notesQuery,
    photosQuery,
    damagesQuery,
    equipmentQuery,
    atmosphericLogsQuery
};