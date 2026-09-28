// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Healthcare {
    enum Role { None, Admin, Doctor, Patient }
    
    address public admin;
    
    struct Doctor {
        string name;
        string designation;
        string hospital;
        string degree;
        uint age;
        string specialization;
        uint patientCount;
        bool exists;
    }
    
    struct Patient {
        string name;
        uint age;
        string gender;
        string bloodGroup;
        string contactNumber;
        string disease;
        string allergies;
        string medications;
        bool exists;
    }

    event DoctorAdded(address indexed doctor, string name, uint timestamp);
    event DoctorUpdated(address indexed doctor, string name, uint timestamp);
    event DoctorRemoved(address indexed doctor, uint timestamp);
    event PatientAdded(address indexed patient, address indexed doctor, string name, uint timestamp);
    event PatientImageAdded(address indexed patient, address indexed doctor, string ipfsHash, uint timestamp);
    
    mapping(address => Doctor) public doctors;
    mapping(address => Patient) public patients;
    mapping(address => Role) public roles;
    mapping(address => address) public patientToDoctor;
    mapping(address => address[]) private doctorPatients;
    mapping(address => string[]) public patientImages;
    address[] public doctorAddresses;
    
    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Role.Admin;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    function addDoctor(
        address _doctor,
        string memory _name,
        string memory _designation,
        string memory _hospital,
        string memory _degree,
        uint _age,
        string memory _specialization
    ) public onlyAdmin {
        require(!doctors[_doctor].exists, "Doctor already exists");
        
        doctors[_doctor] = Doctor(_name, _designation, _hospital, _degree, _age, _specialization, 0, true);
        roles[_doctor] = Role.Doctor;
        doctorAddresses.push(_doctor);
        
        emit DoctorAdded(_doctor, _name, block.timestamp);
    }
    
    function updateDoctor(
        address _doctor,
        string memory _name,
        string memory _designation,
        string memory _hospital,
        string memory _degree,
        uint _age,
        string memory _specialization
    ) public onlyAdmin {
        require(doctors[_doctor].exists, "Doctor does not exist");
        
        doctors[_doctor].name = _name;
        doctors[_doctor].designation = _designation;
        doctors[_doctor].hospital = _hospital;
        doctors[_doctor].degree = _degree;
        doctors[_doctor].age = _age;
        doctors[_doctor].specialization = _specialization;
        
        emit DoctorUpdated(_doctor, _name, block.timestamp);
    }
    
    function removeDoctor(address _doctor) public onlyAdmin {
        require(doctors[_doctor].exists, "Doctor does not exist");
        
        doctors[_doctor].exists = false;
        roles[_doctor] = Role.None;
        
        emit DoctorRemoved(_doctor, block.timestamp);
    }
    
    function addPatient(
        address _patient,
        string memory _name,
        uint _age,
        string memory _gender,
        string memory _bloodGroup,
        string memory _contactNumber,
        string memory _disease,
        string memory _allergies,
        string memory _medications
    ) public {
        require(roles[msg.sender] == Role.Doctor, "Only doctors can add patients");
        require(!patients[_patient].exists, "Patient already exists");
        patients[_patient] = Patient(_name, _age, _gender, _bloodGroup, _contactNumber, _disease, _allergies, _medications, true);
        roles[_patient] = Role.Patient;
        patientToDoctor[_patient] = msg.sender;
        doctorPatients[msg.sender].push(_patient);
        doctors[msg.sender].patientCount++;
        
        emit PatientAdded(_patient, msg.sender, _name, block.timestamp);
    }
    
    function getDoctorCount() public view returns (uint) {
        return doctorAddresses.length;
    }
    
    function getDoctorAddress(uint index) public view returns (address) {
        return doctorAddresses[index];
    }
    
    function getMyRole() public view returns (Role) {
        return roles[msg.sender];
    }
    
    function getMyRecord() public view returns (string memory, uint, string memory, string memory, string memory, string memory, string memory, string memory) {
        require(patients[msg.sender].exists, "No record found");
        Patient memory p = patients[msg.sender];
        return (p.name, p.age, p.gender, p.bloodGroup, p.contactNumber, p.disease, p.allergies, p.medications);
    }
    
    function getMyPatients() public view returns (address[] memory) {
        require(roles[msg.sender] == Role.Doctor, "Only doctors can view their patients");
        return doctorPatients[msg.sender];
    }
    
    function getPatientInfo(address _patient) public view returns (string memory, uint, string memory, address) {
        require(roles[msg.sender] == Role.Doctor, "Only doctors can view patient info");
        require(patientToDoctor[_patient] == msg.sender, "Not your patient");
        Patient memory p = patients[_patient];
        return (p.name, p.age, p.disease, _patient);
    }
    
    function addPatientImage(address _patient, string memory _ipfsHash) public {
        require(roles[msg.sender] == Role.Doctor, "Only doctors can add images");
        require(patientToDoctor[_patient] == msg.sender, "Not your patient");
        patientImages[_patient].push(_ipfsHash);
        
        emit PatientImageAdded(_patient, msg.sender, _ipfsHash, block.timestamp);
    }
    
    function getPatientImages(address _patient) public view returns (string[] memory) {
        require(roles[msg.sender] == Role.Doctor || msg.sender == _patient, "Not authorized");
        if (roles[msg.sender] == Role.Doctor) {
            require(patientToDoctor[_patient] == msg.sender, "Not your patient");
        }
        return patientImages[_patient];
    }
}
