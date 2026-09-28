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
        bool exists;
    }
    
    struct Patient {
        string name;
        uint age;
        string disease;
        bool exists;
    }
    
    mapping(address => Doctor) public doctors;
    mapping(address => Patient) private patients;
    mapping(address => Role) public roles;
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
        
        doctors[_doctor] = Doctor(_name, _designation, _hospital, _degree, _age, _specialization, true);
        roles[_doctor] = Role.Doctor;
        doctorAddresses.push(_doctor);
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
    }
    
    function removeDoctor(address _doctor) public onlyAdmin {
        require(doctors[_doctor].exists, "Doctor does not exist");
        
        doctors[_doctor].exists = false;
        roles[_doctor] = Role.None;
    }
    
    function addPatient(
        address _patient,
        string memory _name,
        uint _age,
        string memory _disease
    ) public {
        require(roles[msg.sender] == Role.Doctor, "Only doctors can add patients");
        patients[_patient] = Patient(_name, _age, _disease, true);
        roles[_patient] = Role.Patient;
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
    
    function getMyRecord() public view returns (string memory, uint, string memory) {
        require(patients[msg.sender].exists, "No record found");
        Patient memory p = patients[msg.sender];
        return (p.name, p.age, p.disease);
    }
}
