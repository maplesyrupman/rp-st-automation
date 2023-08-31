import * as mysql2 from 'mysql2/promise';
import queries from '../utils/queries.js';
const { notesQuery, photosQuery, damagesQuery, equipmentQuery, atmosphericLogsQuery } = queries;

import axios from 'axios';
import jwt from 'jsonwebtoken'

import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.js"

import photoRepData from '../../test-data/test123.json'
import dryRepData from '../../test-data/rocketdry.json'

function generateJWT() {
    const workspaceIdentifier = 'ali.maqsood93@gmail.com'
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

// Create the pool outside the handler.
// const pool = mysql2.createPool({
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

export const scheduledEventLoggerHandler = async (event, context) => {
    let connection;
    try {
        // connection = await pool.getConnection();

        // const today = new Date().toISOString().slice(0, 10);
        // console.log(today);

        // const [todaysNotes] = await connection.execute(notesQuery);
        // const [todaysPhotos] = await connection.execute(photosQuery);
        // const [todaysDamageCauses] = await connection.execute(damagesQuery);
        // const [todaysEquipment] = await connection.execute(equipmentQuery);
        // const [todaysAtmosphericLogs] = await connection.execute(atmosphericLogsQuery);

        // const needPhotoReport = Array.from(new Set([...todaysNotes, ...todaysPhotos, ...todaysDamageCauses].map(project => project.project_id)))
        // const needDryingReport = Array.from(new Set([...todaysEquipment, ...todaysAtmosphericLogs].map(project => project.project_id)))

        // connection = await pool.getConnection();
        const testData = [photoRepData, photoRepData, photoRepData].map(rep => {
            return { data: rep, id: '367461' }
        })

        testData.push({ data: dryRepData, id: '389476' })

        const apiurl = 'https://us1.pdfgeneratorapi.com/api/v4/documents/generate/batch'

        const { data } = await axios.post(apiurl, {
            template: testData,
            format: 'pdf',
            output: 'base64',
            name: 'test'
        },
            {
                headers: {
                    'Authorization': `Bearer ${generateJWT()}`,
                },
            },
        )
        //convert base64 to stream
        const binaryData = Buffer.from(data.response, 'base64');
        const pdfBuffer = new Uint8Array(binaryData);

        const pages = await extractTextFromPdf(pdfBuffer)
        const pageType = pages.map(page => {
            return page.includes('Powered by RocketPlan Technologies') ? 'page' : 'cover'
        })

        const subPDFIndices = getSubPdfIndices(pageType)
        const splittedBuffers = await splitPDF(binaryData, subPDFIndices)//must use binaryData     

        // return NextResponse.json({ message: 'pages' });

    } catch (error) {
        console.log(error);
        // return NextResponse.error(error);
    }
    // } finally {
    //     if (connection) connection.release();
    //     pool.end();
    // }
}