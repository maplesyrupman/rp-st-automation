import FormData from 'form-data'
import jwt from 'jsonwebtoken'
import { PDFDocument } from 'pdf-lib';
import pkg from 'pdfjs-dist';
const { getDocument } = pkg;
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.js"
import queries from '../utils/queries.js';
const { notesQuery, photosQuery, damagesQuery, equipmentQuery, atmosphericLogsQuery } = queries;
import aws from 'aws-sdk'

function generateJWT() {
    const workspaceIdentifier = process.env.PDFGENERATOR_WORKSPACE_ID
    const secret = process.env.PDFGENERATOR_SECRET
    const apiKey = process.env.PDFGENERATOR_API_KEY
    const payload = {
        iss: apiKey,
        sub: workspaceIdentifier,
        exp: Math.floor(Date.now() / 1000) + 30
    }

    return jwt.sign(payload, secret, {
        algorithm: 'HS256'
    });
}

async function extractTextFromPdf(buffer) {
    const pdf = await getDocument({ data: buffer }).promise

    const maxPages = pdf.numPages;
    const pageTextPromises = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const texts = textContent.items.map(item => item.str);
            pageTextPromises.push(texts.join(' '));
        } catch (err) {
            console.log(`page ${pageNum} error: ${err}`);
        }
    }

    const pagesText = await Promise.all(pageTextPromises);
    return pagesText;  // This will be an array of strings, where each string is the content of a page.
}

function getSubPdfIndices(pages) {
    let subPdfIndices = [];
    let start = null;

    for (let i = 0; i < pages.length; i++) {
        if (pages[i] === 'cover') {
            if (start !== null) {
                subPdfIndices.push([start, i - 1]);
            }
            start = i;
        }
    }

    if (start !== null) {
        subPdfIndices.push([start, pages.length - 1]);
    }

    return subPdfIndices;
}

async function splitPDF(pdfBuffer, ranges) {
    const originalPdf = await PDFDocument.load(pdfBuffer);
    const splittedBuffers = [];

    for (let range of ranges) {
        const newPdf = await PDFDocument.create();
        for (let i = range[0]; i <= range[1]; i++) {
            const [copiedPage] = await newPdf.copyPages(originalPdf, [i]);
            newPdf.addPage(copiedPage);
        }
        const pdfBytes = await newPdf.save();
        splittedBuffers.push(pdfBytes);
    }

    return splittedBuffers;
}

function getProjectsQuery(projectIds) {
    const placeholders = projectIds.map(() => '?').join(',');
    return `SELECT id, created_by FROM projects WHERE id IN (${placeholders});`;
}

function getCreateReportsQuery() {
    let placeholders = [];
    let values = [];

    records.forEach(record => {
        placeholders.push("(?, ?, ?, 'Processing')");
        values.push(record.created_by, record.project_id, record.name);
    });

    let sql = `INSERT INTO reports (created_by, project_id, name, status) VALUES ${placeholders.join(", ")}`;
}

function getTodaysDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
}

const s3 = new aws.S3();
async function uploadFileToS3(arrayBuffer, fileName) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `/reports/automated/${fileName}`,
        Body: Buffer.from(arrayBuffer),
        ContentType: 'application/pdf'
    };

    return s3.putObject(params).promise();
}

async function getPersonalAccessToken() {
    const { data } = await axios.post('https://api-qa-mongoose-br2wu78v1.rocketplantech.com/api/auth/login', { password: process.env.RP_PASSWORD, email: process.env.RP_USERNAME })
    return data.token
}

async function getSTToken() {
    const { data } = await axios.post('https://auth-integration.servicetitan.io/connect/token',
        {
            grant_type: 'client_credentials',
            client_id: process.env.ST_CLIENT_ID,
            client_secret: process.env.ST_CLIENT_SECRET
        }, {
        headers: {
            "Content-Type": 'application/x-www-form-urlencoded'
        }
    })

    return data['access_token']
}

async function uploadReportToST(file, fileName, jobId, stAuthToken) {
    const formData = new FormData();
    formData.append('file', file, { filename: fileName, contentType: 'application/pdf' });

    const {data} = await axios.post(`https://api-integration.servicetitan.io/forms/v2/tenant/1037187629/jobs/${jobId}/attachments`, formData, {
        headers: {
            ...formData.getHeaders(),
            "ST-App-Key": process.env.ST_APP_KEY, 
            "Authorization": stAuthToken
        }
    });

    return data
}

async function getPreReportData(connection) {
    const [todaysNotes] = await connection.execute(notesQuery);
    const [todaysPhotos] = await connection.execute(photosQuery);
    const [todaysDamageCauses] = await connection.execute(damagesQuery);
    const [todaysEquipment] = await connection.execute(equipmentQuery);
    const [todaysAtmosphericLogs] = await connection.execute(atmosphericLogsQuery);

    const needPhotoReportIds = Array.from(new Set([...todaysNotes, ...todaysPhotos, ...todaysDamageCauses].map(project => project.project_id)))
    const needDryingReportIds = Array.from(new Set([...todaysEquipment, ...todaysAtmosphericLogs].map(project => project.project_id)))

    const photoRepQuery = getProjectsQuery(needPhotoReportIds)
    const dryingRepQuery = getProjectsQuery(needDryingReportIds)

    const todaysDate = getTodaysDate()

    const [projectsNeedingPhotoRep] = await connection.execute(photoRepQuery, needPhotoReportIds)
    const [projectsNeedingDryingRep] = await connection.execute(dryingRepQuery, needDryingReportIds)

    const preReportData = [...projectsNeedingDryingRep.map(d => {
        const name = `${d.id}-dry-${todaysDate}`
        const created_by = d.created_by
        const project_id = d.id

        return { name, created_by, project_id, settings: { format: 'rocketdry' } }
    }), ...projectsNeedingPhotoRep.map(d => {
        const name = `${d.id}-photo-${todaysDate}`
        const created_by = d.created_by
        const project_id = d.id

        return { name, created_by, project_id, settings: { format: 'compact' } }
    })]

    return preReportData
}

async function getReportIds(connection, preReportData) {
    const values = []
    const placeholders = []

    preReportData.forEach(record => {
        placeholders.push("(?, ?, ?, ?, 'Processing')");
        values.push(record.created_by, record.project_id, record.name, record.settings);
    });

    let sql = `INSERT INTO reports (created_by, project_id, name, settings, status) VALUES ${placeholders.join(", ")};`;

    const [reports] = await connection.execute(sql, values)
    const { affectedRows, insertId } = reports
    console.log(reports)

    const reportIds = []
    for (let i = insertId; i > insertId - affectedRows; i--) {
        reportIds.push(i)
    }
    return reportIds
}

export default {
    generateJWT,
    extractTextFromPdf,
    getSubPdfIndices,
    splitPDF,
    getCreateReportsQuery,
    uploadFileToS3,
    getPersonalAccessToken,
    getSTToken,
    uploadReportToST,
    getPreReportData,
    getReportIds
}