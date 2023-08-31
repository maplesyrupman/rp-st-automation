const formatContentForCoverPageAndClaims = require('./formatContentForCoverPageAndClaims');

const useGetPhotoReportData = connection => async function getPhotoReportData(projectId) {
    let projects = [];

    // Queries
    let projectQuery = `
        SELECT * 
        FROM projects 
        WHERE projects.id = ?;
    `;
const som = {
    project: {
        id: 123
    }, 
    settings: {
        atmospheric_internal: 'yes' || 'no', 
        moisture_logs: 'yes' || 'no',
        //others...
    }
}
    let locationsQuery = `
    SELECT locations.*
    FROM locations 
    JOIN properties ON locations.property_id = properties.id
    WHERE properties.project_id = ?;    
`;

    let propertiesQuery = `
        SELECT * 
        FROM properties 
        WHERE project_id = ?;
    `;

    let claimsQuery = `
        SELECT * 
        FROM claims 
        WHERE project_id = ?;
    `;

    let notesQuery = `
        SELECT * 
        FROM notes 
        WHERE project_id = ?;
    `;

    let photosQuery = `
        SELECT * 
        FROM photos 
        WHERE project_id = ?;
    `;

    try {
        const [projectRows, locationsRows, propertiesRows, claimsRows, notesRows, photosRows] = await Promise.all([
            connection.execute(projectQuery, [projectId]),
            connection.execute(locationsQuery, [projectId]),
            connection.execute(propertiesQuery, [projectId]),
            connection.execute(claimsQuery, [projectId]),
            connection.execute(notesQuery, [projectId]),
            connection.execute(photosQuery, [projectId]),
        ]);

        const projects = projectRows[0].map(project => {
            return {
                ...project,
                locations: locationsRows[0],
                properties: propertiesRows[0].filter(prop => prop.project_id === project.id),
                claims: claimsRows[0].filter(claim => claim.project_id === project.id),
                notes: notesRows[0].filter(note => note.project_id === project.id),
                photos: photosRows[0].filter(photo => photo.project_id === project.id),
            };
        });

        let jsonStructure = formatContentForCoverPageAndClaims({
            type: 'Report',
            name: 'Full',
            env: 'local',
            bucket: "",//change these two lines!!! (one above as well)
            projects,
            table: [],
        });

        return jsonStructure;
        // let jsonString = JSON.stringify(jsonStructure).replace('\n', '<br>');
        // return jsonString;
    } catch (error) {
        console.error('Error fetching report data:', error);
        throw error;
    }
}

module.exports = useGetPhotoReportData;