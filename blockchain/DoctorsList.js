import React, { useEffect, useState } from "react";

function DoctorsList({ contract }) {
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    const loadDoctors = async () => {
      if (!contract) return;

      const count = await contract.methods.getDoctorCount().call();
      const list = [];

      for (let i = 0; i < count; i++) {
        const addr = await contract.methods.getDoctorAddress(i).call();
        const doc = await contract.methods.doctors(addr).call();

        list.push({
          address: addr,
          name: doc.name,
          designation: doc.designation,
          hospital: doc.hospital,
          degree: doc.degree,
          age: doc.age,
          specialization: doc.specialization
        });
      }

      setDoctors(list);
    };

    loadDoctors();
  }, [contract]);

  return (
    <div style={{ padding: "30px" }}>
      <h2>📋 Registered Doctors</h2>

      {doctors.length === 0 && <p>No doctors found.</p>}

      {doctors.map((doc, i) => (
        <div key={i} style={card}>
          <p><b>Name:</b> {doc.name}</p>
          <p><b>Designation:</b> {doc.designation}</p>
          <p><b>Hospital:</b> {doc.hospital}</p>
          <p><b>Degree:</b> {doc.degree}</p>
          <p><b>Age:</b> {doc.age}</p>
          <p><b>Specialization:</b> {doc.specialization}</p>
          <p style={{ fontSize: "12px" }}><b>Wallet:</b> {doc.address}</p>
        </div>
      ))}
    </div>
  );
}

const card = {
  background: "#fff",
  padding: "15px",
  marginBottom: "15px",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
};

export default DoctorsList;
