/**
 * Clause history data layer.
 *
 * Each entry is one change made to a clause: who made it, when, and what
 * changed (clause text, fill-ins, or the clause being created).
 *
 * `modifiedAt` is stored as an ISO 8601 string so it sorts correctly. Pages
 * format it for display with `formatClauseHistoryTimestamp`.
 */

/** One run of text in a tracked-changes view of a clause. */
export interface ChangeSegment {
  type: 'unchanged' | 'removed' | 'added'
  text: string
}

export interface ClauseTextChange {
  /** The clause text before the edit. Paragraphs are separated by a blank line. */
  originalText: string
  /** Text taken out by the edit. Used when `changedSegments` isn't set. */
  removedText?: string
  /** Text put in by the edit. Used when `changedSegments` isn't set. */
  addedText?: string
  /** The edited clause as one tracked-changes document, with removed and added text marked. */
  changedSegments?: ChangeSegment[]
}

export interface ClauseHistoryEntry {
  id: number
  clauseName: string
  modificationType: 'Edited' | 'Added'
  /** Username of the person who made the change. */
  modifiedBy: string
  /** ISO 8601 timestamp. */
  modifiedAt: string
  /** Set when the clause text was edited. */
  textChange?: ClauseTextChange
  fillInsAdded?: number
  fillInsRemoved?: number
}

/**
 * Turns text marked up as "Begin added text ... End added text" and
 * "Begin removed text ... End removed text" into segments.
 *
 * Two quirks of the exported format are handled: an "End" marker with no
 * matching "Begin" is stray and ignored (the text before it is unchanged),
 * and a "Begin" with no "End" runs to the end of the text.
 */
export function parseTrackedChanges(marked: string): ChangeSegment[] {
  const segments: ChangeSegment[] = []
  const push = (type: ChangeSegment['type'], text: string) => {
    if (text !== '') segments.push({ type, text })
  }

  let mode: 'added' | 'removed' | null = null
  let buffer = ''
  let cursor = 0
  const marker = /(Begin|End) (added|removed) text/g

  for (let match = marker.exec(marked); match !== null; match = marker.exec(marked)) {
    buffer += marked.slice(cursor, match.index)
    cursor = match.index + match[0].length
    const kind = match[2] as 'added' | 'removed'

    if (match[1] === 'Begin') {
      push(mode ?? 'unchanged', buffer)
      mode = kind
    } else if (mode === kind) {
      push(kind, buffer)
      mode = null
    } else {
      // Stray "End": there was no matching "Begin", so the text before it is unchanged.
      push(mode ?? 'unchanged', buffer)
    }
    buffer = ''
  }

  push(mode ?? 'unchanged', buffer + marked.slice(cursor))
  return segments
}

/** How many removed and added passages an edit has, or null for short edits without tracked changes. */
export function countChanges(change: ClauseTextChange): { removed: number; added: number } | null {
  if (!change.changedSegments) return null
  return {
    removed: change.changedSegments.filter(s => s.type === 'removed').length,
    added: change.changedSegments.filter(s => s.type === 'added').length,
  }
}

/** Splits segments into paragraphs at blank lines, dropping paragraphs with no visible text. */
export function segmentsToParagraphs(segments: ChangeSegment[]): ChangeSegment[][] {
  const paragraphs: ChangeSegment[][] = [[]]
  for (const segment of segments) {
    segment.text.split(/\n\s*\n/).forEach((part, index) => {
      if (index > 0) paragraphs.push([])
      if (part !== '') paragraphs[paragraphs.length - 1].push({ type: segment.type, text: part })
    })
  }
  return paragraphs.filter(paragraph => paragraph.some(segment => segment.text.trim() !== ''))
}

const ORIGINAL_TEXT =
  'The Contractor shall deliver the supplies described in Section B to ____________ within ____________ days after award. ' +
  'The Contracting Officer may inspect the supplies at ____________ [ place of inspection ]. ' +
  'Delivery schedules may be changed only by written modification.'

const INSPECTION_ORIGINAL_TEXT =
  `(a) Inspection/Acceptance. The Contractor shall only tender for acceptance those items that conform to the requirements of this contract. The Government reserves the right to inspect or test any supplies or services that have been tendered for acceptance. The Government may require repair or replacement of nonconforming supplies or reperformance of nonconforming services at no increase in contract price. If repair/replacement or reperformance will not correct the defects or is not possible, the Government may seek an equitable price reduction or adequate consideration for acceptance of nonconforming supplies or services. The Government must exercise its post-acceptance rights-

(1) Within a reasonable time after the defect was discovered or should have been discovered; and

(2) Before any substantial change occurs in the condition of the item, unless the change is due to the defect in the item.

(b) Assignment. The Contractor or its assignee may assign its rights to receive payment due as a result of performance of this contract to a bank, trust company, or other financing institution, including any Federal lending agency in accordance with the Assignment of Claims Act (31 U.S.C. 3727). However, when a third party makes payment (e.g., use of the Governmentwide commercial purchase card), the Contractor may not assign its rights to receive payment under this contract.

(c) Changes. Changes in the terms and conditions of this contract may be made only by written agreement of the parties.

(d) Disputes. This contract is subject to 41 U.S.C. chapter 71, Contract Disputes. Failure of the parties to this contract to reach agreement on any request for equitable adjustment, claim, appeal or action arising under or relating to this contract shall be a dispute to be resolved in accordance with the clause at Federal Acquisition Regulation (FAR)52.233-1, Disputes, which is incorporated herein by reference. The Contractor shall proceed diligently with performance of this contract, pending final resolution of any dispute arising under the contract.

(e) Definitions. The clause at FAR 52.202-1, Definitions, is incorporated herein by reference.(f) Excusable delays. The Contractor shall be liable for default unless nonperformance is caused by an occurrence beyond the reasonable control of the Contractor and without its fault or negligence such as, acts of God or the public enemy, acts of the Government in either its sovereign or contractual capacity, fires, floods, epidemics, quarantine restrictions, strikes, unusually severe weather, and delays of common carriers. The Contractor shall notify the Contracting Officer in writing as soon as it is reasonably possible after the commencement of any excusable delay, setting forth the full particulars in connection therewith, shall remedy such occurrence with all reasonable dispatch, and shall promptly give written notice to the Contracting Officer of the cessation of such occurrence.

(g) Invoice.

(1) The Contractor shall submit an original invoice and three copies (or electronic invoice, if authorized) to the address designated in the contract to receive invoices. An invoice must include-

(i) Name and address of the Contractor;

(ii) Invoice date and number;

(iii) Contract number, line item number and, if applicable, the order number;

(iv) Description, quantity, unit of measure, unit price and extended price of the items delivered;

(v) Shipping number and date of shipment, including the bill of lading number and weight of shipment if shipped on Government bill of lading;

(vi) Terms of any discount for prompt payment offered;

(vii) Name and address of official to whom payment is to be sent;

(viii) Name, title, and phone number of person to notify in event of defective invoice; and

(ix) Taxpayer Identification Number (TIN). The Contractor shall include its TIN on the invoice only if required elsewhere in this contract.

(x) Electronic funds transfer (EFT) banking information.

(A) The Contractor shall include EFT banking information on the invoice only if required elsewhere in this contract.

(B) If EFT banking information is not required to be on the invoice, in order for the invoice to be a proper invoice, the Contractor shall have submitted correct EFT banking information in accordance with the applicable solicitation provision, contract clause (e.g., 52.232-33, Payment by Elecronic Funds Transfer-System for Award Management, or 52.232-34, Payment by Electronic Funds Transfer-Other Than System for Award Management), or applicable agency procedures.

(C) EFT banking information is not required if the Government waived the requirement to pay by EFT.

(2) Invoices will be handled in accordance with the Prompt Payment Act (31 U.S.C. 3903) and Office of Management and Budget (OMB) prompt payment regulations at 5 CFR Part 1315.

(h) Patent indemnity. The Contractor shall indemnify the Government and its officers, employees and agents against liability, including costs, for actual or alleged direct or contributory infringement of, or inducement to infringe, any United States or foreign patent, trademark or copyright, arising out of the performance of this contract, provided the Contractor is reasonably notified of such claims and proceedings.

(i) Payment.-

(1) Items accepted. Payment shall be made for items accepted by the Government that have been delivered to the delivery destinations set forth in this contract.

(2) Prompt payment. The Government will make payment in accordance with the Prompt Payment Act (31 U.S.C. 3903) and prompt payment regulations at 5 CFR Part 1315.

(3) Electronic Funds Transfer (EFT). If the Government makes payment by EFT, see 52.212-5(b) for the appropriate EFT clause.

(4) Discount. In connection with any discount offered for early payment, time shall be computed from the date of the invoice. For the purpose of computing the discount earned, payment shall be considered to have been made on the date which appears on the payment check or the specified payment date if an electronic funds transfer payment is made.`

const INSPECTION_CHANGED_TEXT =
  `(a) Inspection/Acceptance. The Contractor shall only tender for acceptance those items that conform to the requirements of this contract. The Government reserves the right to inspect or test any supplies or services that have been tendered for acceptance. The Government may require repair or replacement of nonconforming supplies or reperformance of nonconforming services at no increase in contract price. If repair/replacement or reperformance will not correct the defects or is not possible, the Government may seek an equitable price reduction or adequate consideration for acceptance of nonconforming supplies or services. The Government must exercise its post-acceptance rights-End removed text

Begin removed text(1) Within a reasonable time after the defect was discovered or should have been discovered; andEnd removed text

Begin removed text(2) Before any substantial change occurs in the condition of the item, unless the change is due to the defect in the item.End removed text

Begin added texttest alt value (a) Inspection/Acceptance. (1) The Government has the right to inspect and test all materials furnished and services performed under this contract, to the extent practicable at all places and times, including the period of performance, and in any event before acceptance. The Government may also inspect the plant or plants of the Contractor or any subcontractor engaged in contract performance. The Government will perform inspections and tests in a manner that will not unduly delay the work.End added text

Begin added text(2) If the Government performs inspection or tests on the premises of the Contractor or a subcontractor, the Contractor shall furnish and shall require subcontractors to furnish all reasonable facilities and assistance for the safe and convenient performance of these duties.End added text

Begin added text(3) Unless otherwise specified in the contract, the Government will accept or reject services and materials at the place of delivery as promptly as practicable after delivery, and they will be presumed accepted 60 days after the date of delivery, unless accepted earlier.End added text

Begin added text(4) At any time during contract performance, but not later than 6 months (or such other time as may be specified in the contract) after acceptance of the services or materials last delivered under this contract, the Government may require the Contractor to replace or correct services or materials that at time of delivery failed to meet contract requirements. Except as otherwise specified in paragraph (a)(6) of this clause, the cost of replacement or correction shall be determined under paragraph (i) of 6) of this clause, the cost of replacement or correction shall be determined under paragraph (i) of this clause, but the "hourly rate" for labor hours incurred in the replacement or correction shall be reduced to exclude that portion of the rate attributable to profit. Unless otherwise specified below, the portion of the "hourly rate" attributable to profit shall be 10 percent. The Contractor shall not tender for acceptance materials and services required to be replaced or corrected without disclosing the former requirement for replacement or correction, and, when required, shall disclose the corrective action taken. [Insert portion of labor rate attributable to profit.]End added text

Begin added text(5)(i) If the Contractor fails to proceed with reasonable promptness to perform required replacement or correction, and if the replacement or correction can be performed within the ceiling price (or the ceiling price as increased by the Government), the Government may-End added text

Begin added text(A) By contract or otherwise, perform the replacement or correction, charge to the Contractor any increased cost, or deduct such increased cost from any amounts paid or due under this contract; orEnd added text

Begin added text(B) Terminate this contract for cause.End added text

Begin added text(ii) Failure to agree to the amount of increased cost to be charged to the Contractor shall be a dispute under the Disputes clause of the contract.End added text

Begin added text(6) Notwithstanding paragraphs (a)(4) and (5) above, the Government may at any time require the Contractor to remedy by correction or replacement, without cost to the Government, any failure by the Contractor to comply with the requirements of this contract, if the failure is due to-End added text

Begin added text(i) Fraud, lack of good faith, or willful misconduct on the part of the Contractor's managerial personnel; orEnd added text

Begin added text(ii) The conduct of one or more of the Contractor's employees selected or retained by the Contractor after any of the Contractor's managerial personnel has reasonable grounds to believe that the employee is habitually careless or unqualified.End added text

Begin added text(7) This clause applies in the same manner and to the same extent to corrected or replacement materials or services as to materials and services originally delivered under this contract.End added text

Begin added text(8) The Contractor has no obligation or liability under this contract to correct or replace materials and services that at time of delivery do not meet contract requirements, except as provided in this clause or as may be otherwise specified in the contract.End added text

Begin added text(9) Unless otherwise specified in the contract, the Contractor's obligation to correct or replace Government-furnished property shall be governed by the cclause pertaining to Government property.End added text

(b) Assignment. The Contractor or its assignee may assign its rights to receive payment due as a result of performance of this contract to a bank, trust company, or other financing institution, including any Federal lending agency in accordance with the Assignment of Claims Act (31 U.S.C. 3727). However, when a third party makes payment (e.g., use of the Governmentwide commercial purchase card), the Contractor may not assign its rights to receive payment under this contract.

(c) Changes. Changes in the terms and conditions of this contract may be made only by written agreement of the parties.

(d) Disputes. This contract is subject to 41 U.S.C. chapter 71, Contract Disputes. Failure of the parties to this contract to reach agreement on any request for equitable adjustment, claim, appeal or action arising under or relating to this contract shall be a dispute to be resolved in accordance with the clause at Federal Acquisition Regulation (FAR)52.233-1, Disputes, which is incorporated herein by reference. The Contractor shall proceed diligently with performance of this contract, pending final resolution of any dispute arising under the contract.

Begin removed text(e) Definitions. The clause at FAR 52.202-1, Definitions, is incorporated herein by reference.End removed text

Begin added text(e) Definitions. (1) The clause at FAR 52.202-1, Definitions, is incorporated herein by reference. As used in this clause-End added text

Begin added text(i) "Direct materials" means those materials that enter directly into the end product, or that are used or consumed directly in connection with the furnishing of the end product or service.End added text

Begin added text(ii) "Hourly rate" means the rate(s) prescribed in the contract for payment for labor that meets the labor category qualifications of a labor category specified in the contract that are-End added text

Begin added text(A) Performed by the contractor;End added text

Begin added text(B) Performed by the subcontractors; orEnd added text

Begin added text(C) Transferred between divisions, subsidiaries, or affiliates of the contractor under a common control.End added text

Begin added text(iii) "Materials" means-End added text

Begin added text(A) Direct materials, including supplies transferred between divisions, subsidiaries, or affiliates of the contractor under a common control;End added text

Begin added text(B) Subcontracts for supplies and incidental services for which there is not a labor category specified in the contract;End added text

Begin added text(C) Other direct costs (e.g., incidental services for which there is not a labor category specified in the contract, travel, computer usage charges, etc.);End added text

Begin added text(D) The following subcontracts for services which are specifically excluded from the hourly rate: [Insert any subcontracts for services to be excluded from the hourly rates prescribed in the schedule.]; andEnd added text

Begin added text(E) Indirect costs specifically provided for in this clause.End added text

Begin added text(iv) "Subcontract" means any contract, as defined in FAR subpart  2.1, entered into with a subcontractor to furnish supplies or services for performance of the prime contract or a subcontract including transfers between divisions, subsidiaries, or affiliates of a contractor or subcontractor. It includes, but is not limited to, purchase orders, and changes and modifications to purchase orders.End added text

(f) Excusable delays. The Contractor shall be liable for default unless nonperformance is caused by an occurrence beyond the reasonable control of the Contractor and without its fault or negligence such as, acts of God or the public enemy, acts of the Government in either its sovereign or contractual capacity, fires, floods, epidemics, quarantine restrictions, strikes, unusually severe weather, and delays of common carriers. The Contractor shall notify the Contracting Officer in writing as soon as it is reasonably possible after the commencement of any excusable delay, setting forth the full particulars in connection therewith, shall remedy such occurrence with all reasonable dispatch, and shall promptly give written notice to the Contracting Officer of the cessation of such occurrence.

Begin added textEnd added text

(g) Invoice.

(1) The Contractor shall submit an original invoice and three copies (or electronic invoice, if authorized) to the address designated in the contract to receive invoices. An invoice must include-

(i) Name and address of the Contractor;

(ii) Invoice date and number;

(iii) Contract number, line item number and, if applicable, the order number;

(iv) Description, quantity, unit of measure, unit price and extended price of the items delivered;

(v) Shipping number and date of shipment, including the bill of lading number and weight of shipment if shipped on Government bill of lading;

(vi) Terms of any discount for prompt payment offered;

(vii) Name and address of official to whom payment is to be sent;

(viii) Name, title, and phone number of person to notify in event of defective invoice; andvi) Terms of any discount for prompt payment offered;

(vii) Name and address of official to whom payment is to be sent;

(viii) Name, title, and phone number of person to notify in event of defective invoice; and

(ix) Taxpayer Identification Number (TIN). The Contractor shall include its TIN on the invoice only if required elsewhere in this contract.

(x) Electronic funds transfer (EFT) banking information.

(A) The Contractor shall include EFT banking information on the invoice only if required elsewhere in this contract.

(B) If EFT banking information is not required to be on the invoice, in order for the invoice to be a proper invoice, the Contractor shall have submitted correct EFT banking information in accordance with the applicable solicitation provision, contract clause (e.g., 52.232-33, Payment by Electronic Funds Transfer-System for Award Management, or 52.232-34, Payment by Electronic Funds Transfer-Other Than System for Award Management), or applicable agency procedures.

(C) EFT banking information is not required if the Government waived the requirement to pay by EFT.

(2) Invoices will be handled in accordance with the Prompt Payment Act (31 U.S.C. 3903) and Office of Management and Budget (OMB) prompt payment regulations at 5 CFR Part 1315.

(h) Patent indemnity. The Contractor shall indemnify the Government and its officers, employees and agents against liability, including costs, for actual or alleged direct or contributory infringement of, or inducement to infringe, any United States or foreign patent, trademark or copyright, arising out of the performance of this contract, provided the Contractor is reasonably notified of such claims and proceedings.

Begin removed text(i) Payment.-End removed text

Begin removed text(1) Items accepted. Payment shall be made for items accepted by the Government that have been delivered to the delivery destinations set forth in this contract.End removed text

Begin removed text(2) Prompt payment. The Government will make payment in accordance with the Prompt Payment Act (31 U.S.C. 3903) and prompt payment regulations at 5 CFR Part 1315.End removed text

Begin removed text(3) Electronic Funds Transfer (EFT). If the Government makes payment by EFT, see 52.212-5(b) for (3) Electronic Funds Transfer (EFT). If the Government makes payment by EFT, see 52.212-5(b) for the appropriate EFT clause.End removed text

Begin removed text(4) Discount. In connection with any discount offered for early payment, time shall be computed from the date of the invoice. For the purpose of computing the discount earned, payment shall be considered to have been made on the date which appears on the payment check or the specified payment date if an electronic funds transfer payment is made.`

const clauseName = '1-12test | test'

const clauseHistory: ClauseHistoryEntry[] = [
  {
    id: 1,
    clauseName,
    modificationType: 'Edited',
    modifiedBy: 'privilege.user',
    modifiedAt: '2026-04-03T06:00:00',
    textChange: {
      originalText: INSPECTION_ORIGINAL_TEXT,
      changedSegments: parseTrackedChanges(INSPECTION_CHANGED_TEXT),
    },
    // The edit adds two bracketed "[Insert ...]" placeholders (labor rate profit, excluded subcontracts)
    fillInsAdded: 2,
  },
  {
    id: 2,
    clauseName,
    modificationType: 'Edited',
    modifiedBy: 'privilege.user',
    modifiedAt: '2026-04-03T05:54:00',
    textChange: {
      originalText: ORIGINAL_TEXT,
      removedText: 'within ____________ days after award',
      addedText: 'within ____________ calendar days after the date of award',
    },
    fillInsAdded: 4,
  },
  {
    id: 3,
    clauseName,
    modificationType: 'Edited',
    modifiedBy: 'privilege.user',
    modifiedAt: '2024-08-26T22:45:00',
    textChange: {
      originalText: ORIGINAL_TEXT,
      removedText: 'described in Section B',
      addedText: 'described in Section B and Section C',
    },
    fillInsAdded: 3,
    fillInsRemoved: 1,
  },
  {
    id: 4,
    clauseName,
    modificationType: 'Edited',
    modifiedBy: 'privilege.user',
    modifiedAt: '2024-08-26T22:43:00',
    textChange: {
      originalText: ORIGINAL_TEXT,
      removedText: 'The Contracting Officer may inspect the supplies at ____________ [ place of inspection ].',
      addedText: 'The Contracting Officer may inspect the supplies at any reasonable time.',
    },
    fillInsRemoved: 3,
  },
  {
    id: 5,
    clauseName,
    modificationType: 'Edited',
    modifiedBy: 'privilege.user',
    modifiedAt: '2024-08-26T09:49:00',
    textChange: {
      originalText: ORIGINAL_TEXT,
      removedText: 'may be changed only by written modification',
      addedText: 'may be changed only by a written modification signed by the Contracting Officer',
    },
    fillInsAdded: 2,
  },
  {
    id: 6,
    clauseName,
    modificationType: 'Added',
    modifiedBy: 'privilege.user',
    modifiedAt: '2024-08-26T03:21:00',
  },
]

export async function getClauseHistory(): Promise<ClauseHistoryEntry[]> {
  return clauseHistory
}

export async function getClauseHistoryEntry(id: number): Promise<ClauseHistoryEntry | undefined> {
  return clauseHistory.find(e => e.id === id)
}

export async function createClauseHistoryEntry(data: Omit<ClauseHistoryEntry, 'id'>): Promise<ClauseHistoryEntry> {
  const entry = { ...data, id: Math.max(0, ...clauseHistory.map(e => e.id)) + 1 }
  clauseHistory.push(entry)
  return entry
}

export async function updateClauseHistoryEntry(
  id: number,
  data: Partial<ClauseHistoryEntry>,
): Promise<ClauseHistoryEntry | undefined> {
  const idx = clauseHistory.findIndex(e => e.id === id)
  if (idx === -1) return undefined
  clauseHistory[idx] = { ...clauseHistory[idx], ...data }
  return clauseHistory[idx]
}

export async function deleteClauseHistoryEntry(id: number): Promise<boolean> {
  const idx = clauseHistory.findIndex(e => e.id === id)
  if (idx === -1) return false
  clauseHistory.splice(idx, 1)
  return true
}

/** Formats an ISO timestamp the way the history grid displays it, e.g. "Apr 3, 2026 6:00 AM". */
export function formatClauseHistoryTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${datePart} ${timePart}`
}
