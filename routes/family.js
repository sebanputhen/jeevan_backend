const express = require("express");const router = express.Router();

const {
  getAllFamilies,
  getOneFamily,
  createNewFamily,
  updateFamily,
  deleteFamily,
} = require("../controllers/familyController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Family:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The ID of the family
 *         name:
 *           type: string
 *           description: The name of the family
 *         building:
 *           type: string
 *           description: The building of the family
 *         forane:
 *           type: string
 *           description: The ID of the forane
 *         parish:
 *           type: string
 *           description: The ID of the parish
 *         koottayma:
 *           type: string
 *           description: The ID of the koottayma
 *         head:
 *           type: string
 *           description: The ID of the head of the family
 *         phone:
 *           type: string
 *           description: The phone number of the family
 *         street:
 *           type: string
 *           description: The street of the family
 *         city:
 *           type: string
 *           description: The city of the family
 *         district:
 *           type: string
 *           description: The district of the family
 *         pincode:
 *           type: string
 *           description: The pincode of the family
 *       required:
 *         - id
 *         - name
 *         - building
 *         - forane
 *         - parish
 *         - koottayma
 *         - phone
 *         - street
 *         - city
 *         - district
 *         - pincode
 */
/**
 * @swagger
 * /family/kottayma/{koottaymaid}:
 *   get:
 *     summary: Get all families in a specific koottayma
 *     tags: [Family]
 *     parameters:
 *       - in: path
 *         name: koottaymaid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the koottayma
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Family'
 *       500:
 *         description: An error occurred while fetching family data.
 * 
 * /family/{familyid}:
 *   get:
 *     summary: Get a specific family by ID
 *     tags: [Family]
 *     parameters:
 *       - in: path
 *         name: familyid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the family
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Family'
 *       500:
 *         description: An error occurred while fetching family data.
 * 
 *   post:
 *     summary: Create a new family
 *     tags: [Family]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Family'
 *     responses:
 *       201:
 *         description: Family created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Family'
 *       500:
 *         description: An error occurred while creating family.
 * 
 *   put:
 *     summary: Update a specific family by ID
 *     tags: [Family]
 *     parameters:
 *       - in: path
 *         name: familyid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the family
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Family'
 *     responses:
 *       200:
 *         description: Family updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Family'
 *       500:
 *         description: An error occurred while updating family.
 * 
 *   delete:
 *     summary: Delete a specific family by ID
 *     tags: [Family]
 *     parameters:
 *       - in: path
 *         name: familyid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the family
 *     responses:
 *       200:
 *         description: Family deleted successfully
 *       500:
 *         description: An error occurred while deleting family.
 */

router.get("/kottayma/:koottaymaid", getAllFamilies);
router.get("/:familyid", getOneFamily);
router.post("/", createNewFamily);
router.put("/:familyid", updateFamily);
router.delete("/:familyid", deleteFamily);

module.exports = router;
