import type { Unit } from '../src/types/deco.ts';

/**
 * Official U24EC304 Digital Electronics & Computer Organization 5-Unit Syllabus
 * extracted directly from Syllabus_DECO.pdf in Google Drive folder
 * 1rxJWLRAwaXvAfBOgxR_HSkp6vcUTN5O6 (all topics start at not_started / 0% progress).
 */
export function buildOfficialDecoUnits(): Unit[] {
  return [
    {
      unitNumber: 1,
      title: 'Basic Structure of Computers & Data Representation',
      overview:
        'Covers functional units, basic operational concepts, bus structures, software, performance, multiprocessors/multicomputers, and data representation (binary, octal, hex, fixed/floating point, complements, signed arithmetic, binary codes).',
      learningObjectives: [
        'Describe the basic functional units, operational concepts, and bus structures of a digital computer.',
        'Evaluate computer software performance, multiprocessors, and multicomputers.',
        'Demonstrate number base conversions, complements, signed binary arithmetic, fixed-point, floating-point representation, and binary codes.',
      ],
      revisionSummary:
        'Master functional units & bus structures, performance metrics, radix conversions (binary/octal/hex), 1s/2s complements, IEEE/floating-point representation, and BCD/Gray/ASCII binary codes.',
      sourceDocs: ['Syllabus_DECO.pdf', 'U1_Software_and_Performance.pdf', 'DECO_U1_Datarep.pdf'],
      topics: [
        {
          id: 'u1_t1_basic_structure',
          unitNumber: 1,
          title: 'Basic Structure of Computers, Functional Units & Bus Structures',
          description:
            'Basic Structure of Computers, Functional units (Input, Memory, ALU, Control, Output), Basic operational concepts, and Bus structures.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 1 },
            { docName: 'DECO_U1_Datarep.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u1_t2_software_performance',
          unitNumber: 1,
          title: 'Software, Performance, Multiprocessors & Multicomputers',
          description:
            'System software, processor clock, basic performance equation, instruction throughput, multiprocessors and multicomputers.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 1 },
            { docName: 'U1_Software_and_Performance.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u1_t3_number_conversions',
          unitNumber: 1,
          title: 'Binary, Octal, Hexadecimal Numbers & Base Conversions',
          description:
            'Binary Numbers, Octal and Hexadecimal Numbers, and systematic number base conversions.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 1 },
            { docName: 'DECO_U1_Datarep.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u1_t4_fixed_floating_point',
          unitNumber: 1,
          title: 'Fixed-Point & Floating-Point Representation',
          description:
            'Fixed-point representation of integers/fractions and floating-point representation (sign, exponent, mantissa/significand).',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 1 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u1_t5_complements_signed_arithmetic',
          unitNumber: 1,
          title: 'Complements, Signed Binary Numbers & Arithmetic Addition/Subtraction',
          description:
            "r's and (r-1)'s complements, signed magnitude, 1's and 2's complement representation, and signed arithmetic addition and subtraction.",
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 1 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u1_t6_binary_codes',
          unitNumber: 1,
          title: 'Binary Codes',
          description:
            'BCD, Excess-3, Gray code, alphanumeric ASCII, and error-detecting/parity binary codes.',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 1 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
      ],
    },
    {
      unitNumber: 2,
      title: 'Switching Theory & Digital Logic Circuits',
      overview:
        'Covers Boolean algebra and switching functions, logic gates, universal gates, SOP/POS minimization, 2/3/4-variable K-Maps, combinational circuits (Half/Full Adder), and sequential circuits (Flip-flops, Registers, Shift Registers, Binary Counters, Decoders).',
      learningObjectives: [
        'Simplify Boolean expressions using Boolean theorems and SOP/POS canonical forms.',
        'Minimize switching functions using 2-, 3-, and 4-variable Karnaugh maps.',
        'Analyze and design combinational circuits (Half Adder, Full Adder, Decoders) and sequential circuits (Flip-Flops, Registers, Shift Registers, Binary Counters).',
      ],
      revisionSummary:
        'Focus on NAND/NOR universal gate realization, SOP/POS canonical conversion, 4-variable K-Map grouping with don\'t cares, Half/Full Adder truth tables, and SR/JK/D/T flip-flops with shift registers & counters.',
      sourceDocs: ['Syllabus_DECO.pdf', 'DECO_U2_01Aug25.pdf'],
      topics: [
        {
          id: 'u2_t1_boolean_gates',
          unitNumber: 2,
          title: 'Boolean Algebra, Logic Gates & Universal Logic Gates',
          description:
            'Basic logic functions, AND/OR/NOT/XOR/XNOR gates, and NAND/NOR universal logic gates.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 1 },
            { docName: 'DECO_U2_01Aug25.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u2_t2_sop_pos_minimization',
          unitNumber: 2,
          title: 'Reducing Boolean Expressions, SOP & POS Forms',
          description:
            'Algebraic reduction of Boolean expressions and minimization of switching functions in Sum of Products (SOP) and Product of Sums (POS) forms.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 1 },
            { docName: 'DECO_U2_01Aug25.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u2_t3_kmaps',
          unitNumber: 2,
          title: 'Karnaugh Maps (2-, 3-, and 4-Variable K-Maps)',
          description:
            'Graphical minimization of Boolean switching functions using 2-, 3-, and 4-variable Karnaugh maps.',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 1 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u2_t4_combinational_adders',
          unitNumber: 2,
          title: 'Combinational Circuits: Half Adder & Full Adder',
          description:
            'Truth tables, Boolean equations, and logic gate implementations for Half Adder and Full Adder circuits.',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 1 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u2_t5_flip_flops',
          unitNumber: 2,
          title: 'Sequential Circuits: Flip-Flops',
          description:
            'Latches and clocked SR, JK, D, and T flip-flops with characteristic tables and excitation behavior.',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 1 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u2_t6_registers_counters_decoders',
          unitNumber: 2,
          title: 'Registers, Shift Registers, Binary Counters & Decoders',
          description:
            'Storage registers, SISO/SIPO/PISO/PIPO shift registers, ripple/synchronous binary counters, and binary decoders.',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 1 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
      ],
    },
    {
      unitNumber: 3,
      title: 'Computer Arithmetic & Basic Processing Unit',
      overview:
        'Covers multiplication and division algorithms, instruction sets, formats, addressing modes, Register Transfer Language (RTL), arithmetic/logic/shift micro-operations, and microprogrammed control.',
      learningObjectives: [
        'Trace hardware algorithms for binary multiplication and division operations.',
        'Classify instruction formats, addressing modes, and basic machine instructions.',
        'Write Register Transfer Language statements and design arithmetic, logic, shift micro-operations and microprogrammed control.',
      ],
      revisionSummary:
        'Practice Booth/signed multiplication and restoring/non-restoring division flowcharts, addressing modes with effective address formulas, RTL notation, bus/register transfer, and microprogrammed control memory sequencing.',
      sourceDocs: ['Syllabus_DECO.pdf', 'Deco_Unit3.pdf'],
      topics: [
        {
          id: 'u3_t1_mult_div_algorithms',
          unitNumber: 3,
          title: 'Algorithms for Multiplication & Division Operations',
          description:
            'Binary multiplication (hardware/Booth algorithm) and division (restoring/non-restoring) algorithms.',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 1 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u3_t2_instructions_addressing',
          unitNumber: 3,
          title: 'Instruction Set, Instruction Formats & Addressing Modes',
          description:
            'Instruction Set & Instruction Formats, Addressing Modes, and Basic Machine Instructions.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 1 },
            { docName: 'Deco_Unit3.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u3_t3_rtl_register_transfer',
          unitNumber: 3,
          title: 'Register Transfer Language & Register Transfer',
          description:
            'Register Transfer Language (RTL) symbolic notation, bus and memory transfers.',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 1 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u3_t4_micro_operations',
          unitNumber: 3,
          title: 'Arithmetic, Logic & Shift Micro-operations',
          description:
            'Binary adder/subtractor/incrementer arithmetic micro-operations, logic micro-operations, and logical/arithmetic/circular shift micro-operations.',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 2 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u3_t5_microprogrammed_control',
          unitNumber: 3,
          title: 'Microprogrammed Control, Control Memory & Address Sequencing',
          description:
            'Control memory, microinstruction format, address sequencing, and microprogram example.',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 2 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
      ],
    },
    {
      unitNumber: 4,
      title: 'Input/Output & Memory Organization',
      overview:
        'Covers peripheral devices, I/O interface, asynchronous data transfer, modes of transfer (programmed I/O, priority interrupt, DMA), RAM/ROM, memory hierarchy, cache memory mapping, and secondary storage.',
      learningObjectives: [
        'Explain I/O interfaces, asynchronous data transfer handshaking, priority interrupts, and Direct Memory Access (DMA).',
        'Differentiate between RAM, ROM, cache memory, main memory, and secondary storage inside the memory hierarchy.',
        'Analyze cache mapping techniques (direct, associative, set-associative).',
      ],
      revisionSummary:
        'Revise strobe vs. handshaking asynchronous transfer, daisy-chaining/priority interrupts, DMA controller cycle stealing, memory hierarchy speed/cost pyramid, SRAM/DRAM/ROM, and cache mapping formulas.',
      sourceDocs: ['Syllabus_DECO.pdf', 'MEMORY ORGANIZATION.pptx'],
      topics: [
        {
          id: 'u4_t1_peripherals_io_interface',
          unitNumber: 4,
          title: 'Peripheral Devices & Input-Output Interface',
          description:
            'Peripheral devices, I/O bus and interface modules, isolated vs. memory-mapped I/O.',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 2 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u4_t2_async_modes_dma',
          unitNumber: 4,
          title: 'Asynchronous Data Transfer, Priority Interrupt & DMA',
          description:
            'Asynchronous Data Transfer (strobe and handshaking) and Modes of Transfer including Priority Interrupt and Direct Memory Access (DMA).',
          status: 'not_started',
          sourceRefs: [{ docName: 'Syllabus_DECO.pdf', pageNumber: 2 }],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u4_t3_ram_rom',
          unitNumber: 4,
          title: 'Concept of Memory: RAM & ROM Memories',
          description:
            'Concept of memory addressability, word size, RAM (SRAM/DRAM) and ROM (PROM/EPROM/EEPROM) chips.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 2 },
            { docName: 'MEMORY ORGANIZATION.pptx', pageNumber: 4 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u4_t4_hierarchy_cache_mapping',
          unitNumber: 4,
          title: 'Memory Hierarchy, Cache Memory & Mapping',
          description:
            'Memory hierarchy trade-offs, locality of reference, cache memory principles, and direct/associative/set-associative mapping.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 2 },
            { docName: 'MEMORY ORGANIZATION.pptx', pageNumber: 3 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u4_t5_secondary_storage',
          unitNumber: 4,
          title: 'Secondary Storage',
          description:
            'Auxiliary and secondary storage technologies (magnetic disks, magnetic tapes, optical/solid-state storage).',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 2 },
            { docName: 'MEMORY ORGANIZATION.pptx', pageNumber: 3 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
      ],
    },
    {
      unitNumber: 5,
      title: 'Pipelining & Reduced Instruction Set Computer (RISC)',
      overview:
        'Covers CISC vs. RISC characteristics, pipelining fundamentals, data hazards, instruction/control hazards, influence on instruction sets, datapath & control considerations, and superscalar operation.',
      learningObjectives: [
        'Compare CISC and RISC architectural characteristics.',
        'Analyze instruction pipelining stages, speedup, and pipeline hazards (data and instruction hazards).',
        'Describe how pipelining influences instruction set design, datapath/control, and superscalar operation.',
      ],
      revisionSummary:
        'Master CISC vs. RISC comparison table, 4/5-stage pipeline space-time diagrams, structural/data/control hazards with operand forwarding & branch delay slots, and superscalar execution.',
      sourceDocs: ['Syllabus_DECO.pdf', 'RISC.pdf'],
      topics: [
        {
          id: 'u5_t1_cisc_risc',
          unitNumber: 5,
          title: 'CISC Characteristics & RISC Characteristics',
          description:
            'Complex Instruction Set Computer (CISC) vs. Reduced Instruction Set Computer (RISC) architectural principles and trade-offs.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 2 },
            { docName: 'RISC.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u5_t2_pipelining_basics',
          unitNumber: 5,
          title: 'Pipelining: Basic Concepts',
          description:
            'Instruction pipelining stages, pipeline throughput, speedup, and ideal CPI considerations.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 2 },
            { docName: 'RISC.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u5_t3_pipeline_hazards',
          unitNumber: 5,
          title: 'Data Hazards & Instruction Hazards',
          description:
            'RAW/WAR/WAW data hazards, operand forwarding, pipeline stalls, and instruction/branch hazards with branch prediction.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 2 },
            { docName: 'RISC.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u5_t4_datapath_control_isa',
          unitNumber: 5,
          title: 'Influence on Instruction Sets & Datapath/Control Considerations',
          description:
            'Impact of pipelining on addressing modes, instruction formats, register windows, and pipelined datapath/control.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 2 },
            { docName: 'RISC.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
        {
          id: 'u5_t5_superscalar',
          unitNumber: 5,
          title: 'Superscalar Operation',
          description:
            'Multiple-issue superscalar processors, instruction-level parallelism, and out-of-order execution concepts.',
          status: 'not_started',
          sourceRefs: [
            { docName: 'Syllabus_DECO.pdf', pageNumber: 2 },
            { docName: 'RISC.pdf', pageNumber: 1 },
          ],
          definitions: [],
          formulas: [],
          diagrams: [],
          workedExamples: [],
          revisionCount: 0,
        },
      ],
    },
  ];
}
